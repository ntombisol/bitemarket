import { Router } from "express";
import crypto from "node:crypto";
import { registry } from "../services/registry.js";
import { eventBus } from "../services/events.js";
import {
  biteEncrypt,
  decrypt,
  textToHex,
} from "../services/crypto.js";
import { config } from "../config.js";
import type { EncryptedResponse, QueryRequest, SellerListing } from "../types.js";

/**
 * Extract structured params from free-text query using the seller's param schema.
 * Scans query text for option matches, falls back to defaults.
 */
function extractParams(
  seller: SellerListing,
  query: string,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const q = query.toLowerCase();

  for (const [key, field] of Object.entries(seller.params)) {
    if (field.options && field.options.length > 0) {
      if (field.type === "string[]") {
        const matched = field.options.filter((opt) =>
          q.includes(opt.toLowerCase()),
        );
        if (matched.length > 0) {
          params[key] = matched;
        } else if (q.includes("all")) {
          params[key] = [...field.options];
        } else if (field.default !== undefined) {
          params[key] = field.default;
        } else {
          params[key] = [...field.options];
        }
      } else {
        const matched = field.options.find((opt) =>
          q.includes(opt.toLowerCase()),
        );
        if (matched) {
          params[key] = matched;
        } else if (field.default !== undefined) {
          params[key] = field.default;
        } else {
          params[key] = field.options[0];
        }
      }
    } else if (field.default !== undefined) {
      params[key] = field.default;
    }
  }

  return params;
}

// x402 client for server-side payment (used by /query/demo)
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { ExactEvmScheme as ExactEvmClientScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

let _payingFetch: typeof fetch | null = null;
function getPayingFetch() {
  if (_payingFetch) return _payingFetch;
  if (!config.BUYER_PRIVATE_KEY) return null;

  try {
    const key = config.BUYER_PRIVATE_KEY.startsWith("0x")
      ? config.BUYER_PRIVATE_KEY
      : `0x${config.BUYER_PRIVATE_KEY}`;
    const account = privateKeyToAccount(key as `0x${string}`);
    const client = new x402Client();
    client.register(config.NETWORK, new ExactEvmClientScheme(account));
    _payingFetch = wrapFetchWithPayment(fetch, client);
    console.log(`x402 buyer client ready (address: ${account.address})`);
    return _payingFetch;
  } catch (err) {
    console.error("Failed to create x402 buyer client:", err);
    return null;
  }
}

export const queryRouter = Router();

/** Temporary store for encrypted responses awaiting payment */
export const pendingResponses = new Map<string, EncryptedResponse>();

// Clean up old pending responses every 5 minutes
setInterval(() => {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [id, resp] of pendingResponses) {
    if (resp.createdAt < fiveMinAgo) pendingResponses.delete(id);
  }
}, 60_000);

/**
 * POST /query — Encrypted query flow
 *
 * Accepts a BITE-encrypted query, decrypts it, routes to seller,
 * encrypts response, and returns a responseId for x402-gated pickup.
 */
queryRouter.post("/", async (req, res) => {
  try {
    const { sellerId, encryptedQuery, buyerAddress } =
      req.body as QueryRequest;

    if (!sellerId || !encryptedQuery) {
      res.status(400).json({ error: "sellerId and encryptedQuery required" });
      return;
    }

    const seller = registry.get(sellerId);
    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    // 1. Emit: query received (encrypted)
    eventBus.emit("query_received", {
      sellerId,
      buyerAddress: buyerAddress || "anonymous",
      encryptedQuery: encryptedQuery.substring(0, 80) + "...",
      encryptedLength: encryptedQuery.length,
    });

    // 2. Decrypt the BITE-encrypted query
    const { plaintext, biteTxHash: queryDecryptTx } = await decrypt(encryptedQuery);

    eventBus.emit("query_decrypted", {
      sellerId,
      plaintextQuery: plaintext,
      biteTxHash: queryDecryptTx,
    });

    // 3. Route to seller handler
    eventBus.emit("seller_processing", {
      sellerId,
      sellerName: seller.name,
    });

    // Try to parse decrypted text as JSON params; fall back to text extraction
    let handlerParams: Record<string, unknown>;
    try {
      handlerParams = JSON.parse(plaintext);
    } catch {
      handlerParams = extractParams(seller, plaintext);
    }

    const responseData = await seller.handler(handlerParams);
    const responseJson = JSON.stringify(responseData);

    // 4. Encrypt the response
    const encryptedResponse = await biteEncrypt(responseJson);

    eventBus.emit("response_encrypted", {
      sellerId,
      encryptedLength: encryptedResponse.length,
      encryptedPreview: encryptedResponse.substring(0, 80) + "...",
    });

    // 5. Store encrypted response for x402-gated pickup
    const responseId = crypto.randomUUID();
    pendingResponses.set(responseId, {
      sellerId,
      encryptedData: encryptedResponse,
      createdAt: Date.now(),
    });

    eventBus.emit("payment_required", {
      sellerId,
      sellerName: seller.name,
      priceUsd: seller.priceUsd,
      responseId,
    });

    res.json({
      responseId,
      sellerId,
      sellerName: seller.name,
      encryptedPreview: encryptedResponse.substring(0, 60) + "...",
      priceUsd: seller.priceUsd,
      paymentUrl: `/data/${sellerId}?responseId=${responseId}`,
    });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: "Failed to process query" });
  }
});

/**
 * POST /query/demo — Dashboard-friendly query endpoint
 *
 * Accepts plaintext query (no encryption required).
 * Server does encryption/decryption internally for demo visualization.
 */
queryRouter.post("/demo", async (req, res) => {
  try {
    const { sellerId, query, params } = req.body as {
      sellerId: string;
      query?: string;
      params?: Record<string, unknown>;
    };

    if (!sellerId || (!query && !params)) {
      res.status(400).json({ error: "sellerId and (query or params) required" });
      return;
    }

    const seller = registry.get(sellerId);
    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    // Resolve handler params: explicit params take priority, else extract from query text
    const handlerParams = params || extractParams(seller, query || "");
    const queryText = query || JSON.stringify(handlerParams);

    // Encrypt the query to show the BITE flow
    const encryptedQuery = await biteEncrypt(queryText);

    eventBus.emit("query_received", {
      sellerId,
      buyerAddress: "dashboard-demo",
      encryptedQuery: encryptedQuery.substring(0, 80) + "...",
      plaintextQuery: queryText,
      encryptedLength: encryptedQuery.length,
    });

    // Decrypt (demonstrates round-trip)
    const { plaintext: decrypted, biteTxHash: queryDecryptTx } = await decrypt(encryptedQuery);

    eventBus.emit("query_decrypted", {
      sellerId,
      plaintextQuery: decrypted,
      biteTxHash: queryDecryptTx,
    });

    // Route to seller
    eventBus.emit("seller_processing", {
      sellerId,
      sellerName: seller.name,
    });

    const responseData = await seller.handler(handlerParams);
    const responseJson = JSON.stringify(responseData);

    // Encrypt response
    const encryptedResponse = await biteEncrypt(responseJson);

    eventBus.emit("response_encrypted", {
      sellerId,
      encryptedLength: encryptedResponse.length,
      encryptedPreview: encryptedResponse.substring(0, 80) + "...",
    });

    // Store for pickup (encrypted only — no plaintext in memory)
    const responseId = crypto.randomUUID();
    pendingResponses.set(responseId, {
      sellerId,
      encryptedData: encryptedResponse,
      createdAt: Date.now(),
    });

    eventBus.emit("payment_required", {
      sellerId,
      sellerName: seller.name,
      priceUsd: seller.priceUsd,
      responseId,
    });

    // Server-side x402 payment using buyer wallet
    const payingFetch = getPayingFetch();

    if (!payingFetch || !config.SELLER_ADDRESS) {
      eventBus.emit("payment_failed", {
        sellerId,
        responseId,
        reason: "Payment not configured (missing BUYER_PRIVATE_KEY or SELLER_ADDRESS)",
      });
      res.status(402).json({
        error: "Payment required but not configured",
        responseId,
        sellerId,
        priceUsd: seller.priceUsd,
        encryptedQuery: encryptedQuery.substring(0, 60) + "...",
        encryptedResponse: encryptedResponse.substring(0, 60) + "...",
      });
      return;
    }

    const dataUrl = `http://localhost:${config.PORT}/data/${sellerId}?responseId=${responseId}`;
    const payRes = await payingFetch(dataUrl);

    if (!payRes.ok) {
      const errorText = await payRes.text().catch(() => "Unknown payment error");
      eventBus.emit("payment_failed", {
        sellerId,
        responseId,
        reason: `Payment failed: ${payRes.status}`,
      });
      res.status(402).json({
        error: `Payment failed (${payRes.status})`,
        detail: errorText,
        responseId,
        sellerId,
        priceUsd: seller.priceUsd,
        encryptedQuery: encryptedQuery.substring(0, 60) + "...",
        encryptedResponse: encryptedResponse.substring(0, 60) + "...",
      });
      return;
    }

    const payData = await payRes.json();

    // Extract payment receipt from response headers (contains x402 USDC tx hash)
    // x402 v2 uses "payment-response" header with base64-encoded JSON
    let paymentInfo: Record<string, unknown> | null = null;
    const receiptHeader = payRes.headers.get("payment-response")
      || payRes.headers.get("x-payment-response");
    if (receiptHeader) {
      try {
        // Try base64 decode first (x402 v2 format)
        const decoded = Buffer.from(receiptHeader, "base64").toString("utf8");
        paymentInfo = JSON.parse(decoded);
      } catch {
        try {
          paymentInfo = JSON.parse(receiptHeader);
        } catch {
          paymentInfo = { receipt: receiptHeader };
        }
      }
    }

    // Extract BITE decrypt tx hash from the /data response
    const biteTxHash = payData._meta?.biteTxHash || null;

    // Extract x402 payment tx hash from receipt
    // x402 v2 receipt: { success, transaction: "0x...", network, payer }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pi = paymentInfo as any;
    const paymentTxHash: string | null = pi?.transaction || pi?.txHash || pi?.transactionHash || null;

    eventBus.emit("payment_confirmed", {
      sellerId,
      responseId,
      priceUsd: seller.priceUsd,
      paymentTxHash,
      biteTxHash,
    });

    eventBus.emit("data_delivered", {
      sellerId,
      responseId,
      biteTxHash,
    });

    res.json({
      responseId,
      sellerId,
      sellerName: seller.name,
      encryptedQuery: encryptedQuery.substring(0, 60) + "...",
      encryptedResponse: encryptedResponse.substring(0, 60) + "...",
      priceUsd: seller.priceUsd,
      decryptedData: payData.data,
      transactions: {
        queryDecrypt: queryDecryptTx || null,
        responseDecrypt: biteTxHash,
        payment: paymentTxHash,
      },
      ...(paymentInfo ? { payment: paymentInfo } : {}),
    });
  } catch (err) {
    console.error("Demo query error:", err);
    res.status(500).json({ error: "Failed to process demo query" });
  }
});

/**
 * POST /query/prepare — Client-payment-ready query endpoint
 *
 * Like /query/demo but stops before payment. Returns responseId + paymentUrl
 * so the client can pay with their own wallet via x402.
 */
queryRouter.post("/prepare", async (req, res) => {
  try {
    const { sellerId, query, params, buyerAddress } = req.body as {
      sellerId: string;
      query?: string;
      params?: Record<string, unknown>;
      buyerAddress?: string;
    };

    if (!sellerId || (!query && !params)) {
      res.status(400).json({ error: "sellerId and (query or params) required" });
      return;
    }

    const seller = registry.get(sellerId);
    if (!seller) {
      res.status(404).json({ error: "Seller not found" });
      return;
    }

    // Resolve handler params: explicit params take priority, else extract from query text
    const handlerParams = params || extractParams(seller, query || "");
    const queryText = query || JSON.stringify(handlerParams);

    // Encrypt the query (for SSE visualization)
    const encryptedQuery = await biteEncrypt(queryText);

    eventBus.emit("query_received", {
      sellerId,
      buyerAddress: buyerAddress || "wallet-user",
      encryptedQuery: encryptedQuery.substring(0, 80) + "...",
      plaintextQuery: queryText,
      encryptedLength: encryptedQuery.length,
    });

    // Decrypt (demonstrates BITE round-trip)
    const { plaintext: decrypted, biteTxHash: queryDecryptTx } =
      await decrypt(encryptedQuery);

    eventBus.emit("query_decrypted", {
      sellerId,
      plaintextQuery: decrypted,
      biteTxHash: queryDecryptTx,
    });

    // Route to seller handler
    eventBus.emit("seller_processing", {
      sellerId,
      sellerName: seller.name,
    });

    const responseData = await seller.handler(handlerParams);
    const responseJson = JSON.stringify(responseData);

    // Encrypt response
    const encryptedResponse = await biteEncrypt(responseJson);

    eventBus.emit("response_encrypted", {
      sellerId,
      encryptedLength: encryptedResponse.length,
      encryptedPreview: encryptedResponse.substring(0, 80) + "...",
    });

    // Store for x402-gated pickup
    const responseId = crypto.randomUUID();
    pendingResponses.set(responseId, {
      sellerId,
      encryptedData: encryptedResponse,
      createdAt: Date.now(),
    });

    eventBus.emit("payment_required", {
      sellerId,
      sellerName: seller.name,
      priceUsd: seller.priceUsd,
      responseId,
    });

    // Return info for client-side payment (NO server-side payment)
    res.json({
      responseId,
      sellerId,
      sellerName: seller.name,
      encryptedQuery: encryptedQuery.substring(0, 60) + "...",
      encryptedResponse: encryptedResponse.substring(0, 60) + "...",
      priceUsd: seller.priceUsd,
      paymentUrl: `/data/${sellerId}?responseId=${responseId}`,
      transactions: {
        queryDecrypt: queryDecryptTx || null,
      },
    });
  } catch (err) {
    console.error("Prepare query error:", err);
    res.status(500).json({ error: "Failed to prepare query" });
  }
});
