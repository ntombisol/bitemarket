/**
 * BITE Market Demo Script
 *
 * Runs the full encrypted data marketplace flow:
 * 1. Lists available sellers
 * 2. Sends BITE-encrypted queries
 * 3. Pays via x402 (or skips payment in dev mode)
 * 4. Receives decrypted data
 *
 * Usage:
 *   Start the API server first: npm run dev
 *   Then run: npm run demo
 *
 * Set BUYER_PRIVATE_KEY in .env for x402 payments.
 * Without it, runs in dev mode (no payment gating).
 */

import dotenv from "dotenv";
dotenv.config();

const API_URL = process.env.API_URL || "http://localhost:4021";
const BUYER_KEY = process.env.BUYER_PRIVATE_KEY;

// Colors for terminal output
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function log(color: string, label: string, msg: string) {
  console.log(`  ${color}${c.bold}[${label}]${c.reset} ${msg}`);
}

function separator() {
  console.log(
    `${c.dim}  ${"─".repeat(60)}${c.reset}`,
  );
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log(`\n${c.bold}${c.cyan}  ╔══════════════════════════════════════╗${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ║     BITE Market — Demo Flow          ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ║  Encrypted Data for AI Agents        ║${c.reset}`);
  console.log(`${c.bold}${c.cyan}  ╚══════════════════════════════════════╝${c.reset}\n`);

  const mode = BUYER_KEY ? "x402 Payment Mode" : "Dev Mode (no payments)";
  log(c.yellow, "MODE", mode);
  log(c.blue, "API", API_URL);
  separator();

  // 1. List sellers
  log(c.cyan, "STEP 1", "Discovering data sellers...");
  const regRes = await fetch(`${API_URL}/registry`);
  const { sellers } = (await regRes.json()) as { sellers: Array<{ id: string; name: string; priceUsd: string; category: string }> };

  for (const s of sellers) {
    log(
      c.green,
      "SELLER",
      `${s.name} (${s.id}) — ${s.priceUsd} — ${s.category}`,
    );
  }
  separator();
  await sleep(500);

  // 2. Demo queries
  const queries = [
    {
      sellerId: "weather-global",
      query: "What's the weather in San Francisco today?",
    },
    {
      sellerId: "crypto-prices",
      query: "Give me BTC and SOL prices",
    },
    {
      sellerId: "trading-signals",
      query: "SOL trading signals for this week",
    },
  ];

  for (const { sellerId, query } of queries) {
    console.log();
    log(c.magenta, "QUERY", `"${query}"`);
    log(c.yellow, "ENCRYPT", "BITE-encrypting query with AES-256-GCM via WASM...");

    // Use the demo endpoint (server-side encryption for simplicity)
    const queryRes = await fetch(`${API_URL}/query/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sellerId, query }),
    });

    const queryResult = (await queryRes.json()) as {
      responseId: string;
      sellerName: string;
      encryptedQuery: string;
      encryptedResponse: string;
      priceUsd: string;
      paymentUrl: string;
    };

    log(
      c.red,
      "CIPHER",
      `Query encrypted: ${queryResult.encryptedQuery}`,
    );
    log(
      c.red,
      "CIPHER",
      `Response encrypted: ${queryResult.encryptedResponse}`,
    );
    log(
      c.yellow,
      "PRICE",
      `${queryResult.priceUsd} USDC via x402`,
    );

    await sleep(300);

    // Fetch decrypted data (in dev mode, no payment required)
    if (!BUYER_KEY) {
      const dataRes = await fetch(
        `${API_URL}${queryResult.paymentUrl}`,
      );
      const data = await dataRes.json();

      log(c.green, "DECRYPT", "Response decrypted:");
      console.log(
        `${c.dim}${JSON.stringify((data as { data: unknown }).data, null, 2)
          .split("\n")
          .map((l: string) => "    " + l)
          .join("\n")}${c.reset}`,
      );
    } else {
      log(
        c.blue,
        "PAYMENT",
        `x402 payment would be sent to ${queryResult.paymentUrl}`,
      );
    }

    separator();
    await sleep(500);
  }

  console.log();
  log(c.green, "DONE", "All queries processed successfully!");
  log(c.cyan, "NOTE", "On-chain: Only USDC payments visible");
  log(c.cyan, "NOTE", "Off-chain: All data content fully encrypted");
  console.log();
}

main().catch((err) => {
  console.error("Demo failed:", err);
  process.exit(1);
});
