export interface SellerInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  priceUsd: string;
  sampleResponse: unknown;
}

export interface QueryResult {
  responseId: string;
  sellerId: string;
  sellerName: string;
  encryptedPreview: string;
  priceUsd: string;
  paymentUrl: string;
}

export interface DataResult {
  data: unknown;
  _meta: {
    sellerId: string;
    responseId: string;
    decrypted: boolean;
  };
}

export interface BiteMarketClientOptions {
  /** Private key for x402 payments (hex with 0x prefix) */
  privateKey: `0x${string}`;
  /** API server base URL */
  baseUrl: string;
}
