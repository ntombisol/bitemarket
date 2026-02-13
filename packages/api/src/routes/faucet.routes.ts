import { Router } from "express";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  parseUnits,
  defineChain,
  erc20Abi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { config } from "../config.js";

const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
});

export const faucetRouter = Router();

// Rate limiting
const drips = new Map<string, number>(); // address → last drip timestamp
let totalDrips = 0;

const RATE_LIMIT_MS = 10 * 60 * 1000; // 10 minutes per address
const MAX_TOTAL_DRIPS = 200; // lifetime cap
const USDC_DRIP = parseUnits("0.01", 6); // 0.01 USDC (6 decimals)
const ETH_DRIP = parseEther("0.0001"); // 0.0001 ETH for gas

const USDC_ADDRESS = config.USDC_ADDRESS as `0x${string}`;

// Lazy-init faucet wallet (reuses BUYER_PRIVATE_KEY on Base Sepolia)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _walletClient: any = null;
let _publicClient: ReturnType<typeof createPublicClient> | null = null;

function getClients() {
  if (_walletClient && _publicClient)
    return { wallet: _walletClient, public: _publicClient! };

  if (!config.BUYER_PRIVATE_KEY)
    throw new Error("BUYER_PRIVATE_KEY not configured");

  const key = config.BUYER_PRIVATE_KEY.startsWith("0x")
    ? config.BUYER_PRIVATE_KEY
    : `0x${config.BUYER_PRIVATE_KEY}`;

  const account = privateKeyToAccount(key as `0x${string}`);

  _walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  _publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http("https://sepolia.base.org"),
  });

  return { wallet: _walletClient, public: _publicClient! };
}

/**
 * POST /faucet — Send test USDC + ETH to a wallet address
 *
 * Rate limited: 1 drip per address per 10 minutes, 200 lifetime drips.
 * Uses the BUYER_PRIVATE_KEY wallet on Base Sepolia.
 */
faucetRouter.post("/", async (req, res) => {
  try {
    const { address } = req.body as { address: string };

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      res.status(400).json({ error: "Valid Ethereum address required" });
      return;
    }

    const normalized = address.toLowerCase();

    // Lifetime cap
    if (totalDrips >= MAX_TOTAL_DRIPS) {
      res
        .status(429)
        .json({ error: "Faucet depleted — max lifetime drips reached." });
      return;
    }

    // Per-address rate limit
    const lastDrip = drips.get(normalized);
    if (lastDrip && Date.now() - lastDrip < RATE_LIMIT_MS) {
      const waitSec = Math.ceil(
        (RATE_LIMIT_MS - (Date.now() - lastDrip)) / 1000,
      );
      res.status(429).json({
        error: `Rate limited. Try again in ${waitSec}s.`,
      });
      return;
    }

    const { wallet, public: publicClient } = getClients();

    // Send USDC (ERC20 transfer) — this is the critical part
    const usdcTxHash = await wallet.writeContract({
      address: USDC_ADDRESS,
      abi: erc20Abi,
      functionName: "transfer",
      args: [address as `0x${string}`, USDC_DRIP],
    });

    await publicClient.waitForTransactionReceipt({ hash: usdcTxHash });

    // Try to send a tiny ETH for gas (best-effort, x402 doesn't need it)
    let ethTxHash: string | null = null;
    let ethAmount = "0";
    try {
      ethTxHash = await wallet.sendTransaction({
        to: address as `0x${string}`,
        value: ETH_DRIP,
      });
      await publicClient.waitForTransactionReceipt({ hash: ethTxHash });
      ethAmount = "0.0001";
    } catch {
      console.warn("Faucet: ETH drip skipped (wallet may be low on ETH)");
    }

    // Track
    drips.set(normalized, Date.now());
    totalDrips++;

    console.log(
      `Faucet drip #${totalDrips}: ${address.slice(0, 10)}... (USDC: ${usdcTxHash.slice(0, 14)}...${ethTxHash ? `, ETH: ${ethTxHash.slice(0, 14)}...` : ""})`,
    );

    res.json({
      success: true,
      usdcAmount: "0.01",
      ethAmount,
      usdcTxHash,
      ethTxHash,
      remainingDrips: MAX_TOTAL_DRIPS - totalDrips,
    });
  } catch (err) {
    console.error("Faucet error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Faucet transfer failed",
    });
  }
});
