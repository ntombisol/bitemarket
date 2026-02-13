import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { biteEncrypt } from "./crypto.js";
import type {
  BiteMarketClientOptions,
  SellerInfo,
  QueryResult,
  DataResult,
} from "./types.js";

export class BiteMarketClient {
  private fetchWithPayment: typeof fetch;
  private baseUrl: string;
  private address: string;

  constructor(options: BiteMarketClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");

    // Set up x402 payment-enabled fetch
    const signer = privateKeyToAccount(options.privateKey);
    this.address = signer.address;

    const scheme = new ExactEvmScheme(signer);
    const client = new x402Client();
    client.register("eip155:84532", scheme); // Base Sepolia

    this.fetchWithPayment = wrapFetchWithPayment(fetch, client);
  }

  /** Get the buyer's wallet address */
  getAddress(): string {
    return this.address;
  }

  /** List all available data sellers */
  async listSellers(): Promise<SellerInfo[]> {
    const res = await fetch(`${this.baseUrl}/registry`);
    const body = (await res.json()) as { sellers: SellerInfo[] };
    return body.sellers;
  }

  /** Get details for a specific seller */
  async getSeller(id: string): Promise<SellerInfo> {
    const res = await fetch(`${this.baseUrl}/registry/${id}`);
    if (!res.ok) throw new Error(`Seller ${id} not found`);
    return (await res.json()) as SellerInfo;
  }

  /**
   * Send an encrypted query to a seller and pay for the response.
   *
   * This performs the full BITE Market flow:
   * 1. BITE-encrypt the query
   * 2. POST encrypted query to the marketplace
   * 3. GET the response (x402 automatically handles payment)
   * 4. Return the decrypted data
   */
  async query(sellerId: string, queryText: string): Promise<DataResult> {
    // 1. BITE-encrypt the query
    const encryptedQuery = await biteEncrypt(queryText);

    // 2. Send encrypted query
    const queryRes = await fetch(`${this.baseUrl}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId,
        encryptedQuery,
        buyerAddress: this.address,
      }),
    });

    if (!queryRes.ok) {
      const err = await queryRes.text();
      throw new Error(`Query failed: ${err}`);
    }

    const queryResult = (await queryRes.json()) as QueryResult;

    // 3. Fetch data (x402 handles payment automatically)
    const dataRes = await this.fetchWithPayment(
      `${this.baseUrl}/data/${sellerId}?responseId=${queryResult.responseId}`,
    );

    if (!dataRes.ok) {
      const err = await dataRes.text();
      throw new Error(`Data fetch failed (${dataRes.status}): ${err}`);
    }

    return (await dataRes.json()) as DataResult;
  }
}
