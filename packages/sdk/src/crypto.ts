import { BITEMockup } from "@skalenetwork/bite";

const bite = new BITEMockup();

/** Convert UTF-8 string to hex */
export function textToHex(text: string): string {
  return Buffer.from(text, "utf8").toString("hex");
}

/**
 * Encrypt plaintext using BITE mockup (real AES-256-GCM via WASM).
 * Client-side only — encrypt queries before sending to the marketplace.
 */
export async function biteEncrypt(plaintext: string): Promise<string> {
  const hex = textToHex(plaintext);
  const paddedHex = hex.length % 2 === 0 ? hex : "0" + hex;
  return bite.encryptMessage(paddedHex);
}
