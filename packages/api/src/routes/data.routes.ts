import { Router } from "express";
import { eventBus } from "../services/events.js";
import { decrypt } from "../services/crypto.js";
import { pendingResponses } from "./query.routes.js";

export const dataRouter = Router();

/**
 * GET /data/:sellerId — x402-gated data endpoint
 *
 * This route is behind x402 payment middleware.
 * After payment is verified, returns the decrypted response.
 */
dataRouter.get("/:sellerId", async (req, res) => {
  const { sellerId } = req.params;
  const responseId = req.query.responseId as string;

  if (!responseId) {
    res.status(400).json({ error: "responseId query parameter required" });
    return;
  }

  const pending = pendingResponses.get(responseId);
  if (!pending) {
    res.status(404).json({ error: "Response not found or expired" });
    return;
  }

  if (pending.sellerId !== sellerId) {
    res.status(400).json({ error: "sellerId mismatch" });
    return;
  }

  // Payment confirmed (if we got here, x402 middleware already verified payment)
  eventBus.emit("payment_confirmed", {
    sellerId,
    responseId,
  });

  // Decrypt the stored response (real BITE threshold decrypt or mockup fallback)
  try {
    const { plaintext, biteTxHash } = await decrypt(pending.encryptedData);
    const data = JSON.parse(plaintext);

    // Clean up
    pendingResponses.delete(responseId);

    eventBus.emit("data_delivered", {
      sellerId,
      responseId,
      biteTxHash,
      dataPreview:
        plaintext.length > 100
          ? plaintext.substring(0, 100) + "..."
          : plaintext,
    });

    res.json({ data, _meta: { sellerId, responseId, decrypted: true, biteTxHash } });
  } catch (err) {
    console.error("Decryption error:", err);
    res.status(500).json({ error: "Failed to decrypt response" });
  }
});
