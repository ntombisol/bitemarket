export interface SellerListing {
  id: string;
  name: string;
  description: string;
  category: "weather" | "crypto" | "signals" | "custom";
  priceUsd: string; // e.g. "$0.001"
  sampleResponse: unknown;
  handler: (query: string) => Promise<unknown>;
}

/** Serializable seller info (no handler function) */
export interface SellerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: string;
  sampleResponse: unknown;
}

export interface QueryRequest {
  sellerId: string;
  encryptedQuery: string; // BITE-wrapped ciphertext
  buyerAddress?: string;
}

export interface QueryResponse {
  responseId: string;
  sellerId: string;
  encryptedPreview: string; // first N chars of ciphertext
  priceUsd: string;
}

export interface EncryptedResponse {
  sellerId: string;
  encryptedData: string; // BITE-encrypted response (no plaintext stored)
  createdAt: number;
}

export type FlowEventType =
  | "query_received"
  | "query_decrypted"
  | "seller_processing"
  | "response_encrypted"
  | "payment_required"
  | "payment_confirmed"
  | "payment_failed"
  | "data_delivered";

export interface FlowEvent {
  id: string;
  timestamp: number;
  type: FlowEventType;
  data: Record<string, unknown>;
}
