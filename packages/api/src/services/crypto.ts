import { BITE, BITEMockup } from "@skalenetwork/bite";
import { decode as rlpDecode } from "@ethereumjs/rlp";
import crypto from "node:crypto";
import {
  createWalletClient,
  createPublicClient,
  http,
  defineChain,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

// BITE mockup binary format constants (for fallback local decrypt)
const HEADER_SIZE = 1;
const AES_KEY_SIZE = 32;
const CIPHERED_KEY_SIZE = 224;
const AES_GCM_IV_SIZE = 12;
const AES_GCM_TAG_SIZE = 16;
const RANDOM_SECRET_SIZE = 32;

// Dummy "to" address for BITE transactions (data-only, no real recipient)
const BITE_DATA_RECIPIENT =
  "0x0000000000000000000000000000000000000001" as `0x${string}`;

// --- BITE V2 Sandbox chain definition ---
const biteChain = defineChain({
  id: config.BITE_CHAIN_ID,
  name: "SKALE BITE V2 Sandbox",
  nativeCurrency: { name: "sFUEL", symbol: "sFUEL", decimals: 18 },
  rpcUrls: {
    default: { http: [config.BITE_RPC] },
  },
});

// --- Encryption mode ---
let _bite: BITE | BITEMockup | null = null;
let _useRealBite = false;

async function getBite(): Promise<BITE | BITEMockup> {
  if (_bite) return _bite;

  // Try real BITE first
  try {
    const realBite = new BITE(config.BITE_RPC);
    const committees = await realBite.getCommitteesInfo();
    if (committees && committees.length > 0) {
      _bite = realBite;
      _useRealBite = true;
      console.log(
        `BITE V2 Sandbox connected (${committees.length} committee(s), epoch ${committees[0].epochId})`,
      );
      return _bite;
    }
  } catch (err) {
    console.warn(
      "BITE V2 Sandbox unavailable, falling back to BITEMockup:",
      (err as Error).message,
    );
  }

  // Fallback to mockup
  _bite = new BITEMockup();
  _useRealBite = false;
  console.log("Using BITEMockup (local encryption, no threshold)");
  return _bite;
}

export function isRealBite(): boolean {
  return _useRealBite;
}

/** Convert UTF-8 string to hex */
export function textToHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex");
}

/** Convert hex to UTF-8 string */
export function hexToText(hex: string): string {
  return Buffer.from(hex, "hex").toString("utf8");
}

/**
 * Encrypt plaintext using BITE.
 *
 * Real BITE: uses encryptTransaction() which the BITE chain can threshold-decrypt.
 * Mockup: uses encryptMessage() for local AES-256-GCM.
 *
 * Returns the encrypted data (0x-prefixed hex).
 */
export async function biteEncrypt(plaintext: string): Promise<string> {
  const bite = await getBite();
  const hex = textToHex(plaintext);
  const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
  const dataHex = `0x${paddedHex}`;

  if (_useRealBite && bite instanceof BITE) {
    // Real BITE: encrypt as a transaction (validators can threshold-decrypt)
    const encTx = await bite.encryptTransaction({
      to: BITE_DATA_RECIPIENT,
      data: dataHex,
      gasLimit: config.BITE_GAS_LIMIT,
    });
    // Return just the encrypted data field (the BITE envelope)
    return encTx.data as string;
  }

  // Mockup: encrypt as message
  return bite.encryptMessage(paddedHex);
}

// --- Decryption ---

let _walletClient: ReturnType<typeof createWalletClient> | null = null;
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

function getClients() {
  if (_walletClient && _publicClient)
    return { wallet: _walletClient, public: _publicClient };

  const key = config.BUYER_PRIVATE_KEY.startsWith("0x")
    ? config.BUYER_PRIVATE_KEY
    : `0x${config.BUYER_PRIVATE_KEY}`;
  const account = privateKeyToAccount(key as `0x${string}`);

  _walletClient = createWalletClient({
    account,
    chain: biteChain,
    transport: http(config.BITE_RPC),
  });

  _publicClient = createPublicClient({
    chain: biteChain,
    transport: http(config.BITE_RPC),
  });

  console.log(`BITE chain wallet ready (address: ${account.address})`);
  return { wallet: _walletClient, public: _publicClient };
}

export interface DecryptResult {
  plaintext: string;
  biteTxHash?: string;
}

/**
 * Decrypt using real BITE V2: submit encrypted data as tx to BITE chain,
 * wait for finality, then retrieve decrypted data via RPC.
 *
 * This is REAL threshold decryption — validators cooperate to decrypt.
 */
export async function biteDecrypt(biteEncrypted: string): Promise<DecryptResult> {
  const { wallet, public: publicClient } = getClients();
  const bite = (await getBite()) as BITE;

  // 1. Submit encrypted data as transaction to BITE magic address
  // @ts-expect-error — viem strict typing vs runtime account from walletClient
  const txHash: `0x${string}` = await wallet.sendTransaction({
    to: config.BITE_ADDRESS,
    data: biteEncrypted as `0x${string}`,
    gas: BigInt(config.BITE_GAS_LIMIT),
  });

  // 2. Wait for block finality
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  // 3. Retrieve decrypted data from validators
  // Returns { data: '0x...', to: '0x...' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await bite.getDecryptedTransactionData(txHash);

  // 4. Extract the data field (our original hex payload)
  const dataHex: string =
    typeof result === "object" && result.data
      ? result.data
      : (result as string);

  const cleanHex = dataHex.startsWith("0x") ? dataHex.slice(2) : dataHex;
  return { plaintext: hexToText(cleanHex), biteTxHash: txHash };
}

/**
 * Decrypt BITE data — uses real threshold decryption if available,
 * falls back to local mockup decrypt.
 */
export async function decrypt(biteEncrypted: string): Promise<DecryptResult> {
  if (_useRealBite) {
    return biteDecrypt(biteEncrypted);
  }
  return { plaintext: mockupDecrypt(biteEncrypted) };
}

/**
 * Local mockup decrypt (fallback when BITE V2 Sandbox is unavailable).
 * Extracts plaintext AES key from the BITE envelope and decrypts locally.
 */
export function mockupDecrypt(biteEncrypted: string): string {
  const withoutPrefix = biteEncrypted.startsWith("0x")
    ? biteEncrypted.slice(2)
    : biteEncrypted;
  const decoded = rlpDecode(Buffer.from(withoutPrefix, "hex"));
  const rawArray = decoded as Uint8Array[];
  const raw = Buffer.from(rawArray[1]);

  const aesKey = raw.subarray(HEADER_SIZE, HEADER_SIZE + AES_KEY_SIZE);
  const aesPayload = raw.subarray(HEADER_SIZE + CIPHERED_KEY_SIZE);
  const iv = aesPayload.subarray(0, AES_GCM_IV_SIZE);
  const tag = aesPayload.subarray(aesPayload.length - AES_GCM_TAG_SIZE);
  const ciphertext = aesPayload.subarray(
    AES_GCM_IV_SIZE,
    aesPayload.length - AES_GCM_TAG_SIZE,
  );

  const decipher = crypto.createDecipheriv("aes-256-gcm", aesKey, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  const originalHex = decrypted
    .subarray(0, decrypted.length - RANDOM_SECRET_SIZE)
    .toString("hex");
  return hexToText(originalHex);
}

/**
 * Test crypto at startup — verifies encryption + decryption works.
 */
export async function testCryptoRoundTrip(): Promise<boolean> {
  const testMessage = "Hello BITE Market!";
  try {
    const encrypted = await biteEncrypt(testMessage);

    if (_useRealBite) {
      try {
        const { plaintext: decrypted } = await biteDecrypt(encrypted);
        if (decrypted !== testMessage) {
          console.error(
            `BITE V2 round-trip FAILED: expected "${testMessage}", got "${decrypted}"`,
          );
          console.warn("Falling back to BITEMockup");
          _useRealBite = false;
          _bite = new BITEMockup();
          return testMockupRoundTrip(testMessage);
        }
        console.log(
          "BITE V2 round-trip OK: real threshold encrypt → on-chain decrypt",
        );
        return true;
      } catch (err) {
        console.warn(
          "BITE V2 decrypt failed:",
          (err as Error).message,
        );
        console.warn("Falling back to BITEMockup");
        _useRealBite = false;
        _bite = new BITEMockup();
        return testMockupRoundTrip(testMessage);
      }
    } else {
      const decrypted = mockupDecrypt(encrypted);
      if (decrypted !== testMessage) {
        console.error("BITEMockup round-trip FAILED");
        return false;
      }
      console.log("Crypto round-trip OK: BITEMockup encrypt → local decrypt");
      return true;
    }
  } catch (err) {
    console.error("Crypto round-trip FAILED:", err);
    return false;
  }
}

async function testMockupRoundTrip(testMessage: string): Promise<boolean> {
  const mockEnc = await (_bite as BITEMockup).encryptMessage(
    textToHex(testMessage).length % 2 === 0
      ? textToHex(testMessage)
      : "0" + textToHex(testMessage),
  );
  const mockDec = mockupDecrypt(mockEnc);
  if (mockDec !== testMessage) {
    console.error("BITEMockup fallback also failed!");
    return false;
  }
  console.log("BITEMockup fallback OK");
  return true;
}
