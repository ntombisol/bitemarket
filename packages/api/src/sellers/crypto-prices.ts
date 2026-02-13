import type { SellerListing } from "../types.js";

export const cryptoPricesSeller: SellerListing = {
  id: "crypto-prices",
  name: "Crypto Price Feed",
  description:
    "Real-time cryptocurrency prices with 24h change, volume, and market cap. Supports BTC, ETH, SOL, and more.",
  category: "crypto",
  priceUsd: "$0.001",
  sampleResponse: {
    BTC: { price: 97542.12, change24h: 2.3, volume24h: "32.1B" },
    ETH: { price: 3421.56, change24h: -1.1, volume24h: "15.7B" },
    SOL: { price: 178.34, change24h: 5.7, volume24h: "4.2B" },
  },
  async handler(query: string) {
    const q = query.toLowerCase();

    const prices: Record<
      string,
      { base: number; volatility: number; mcap: string }
    > = {
      BTC: { base: 97500, volatility: 2000, mcap: "1.92T" },
      ETH: { base: 3400, volatility: 150, mcap: "410B" },
      SOL: { base: 178, volatility: 12, mcap: "82B" },
      AVAX: { base: 38, volatility: 3, mcap: "15B" },
      LINK: { base: 19, volatility: 2, mcap: "12B" },
      DOT: { base: 7.5, volatility: 0.8, mcap: "10B" },
    };

    // Filter to requested tokens or return all
    const requested = Object.keys(prices).filter(
      (token) => q.includes(token.toLowerCase()) || q.includes("all"),
    );
    const tokens = requested.length > 0 ? requested : Object.keys(prices);

    const result: Record<string, unknown> = {};
    for (const token of tokens) {
      const p = prices[token];
      const change = (Math.random() - 0.5) * 10;
      result[token] = {
        price: Math.round((p.base + (Math.random() - 0.5) * p.volatility) * 100) / 100,
        change24h: Math.round(change * 100) / 100,
        volume24h: `$${(Math.random() * 30 + 1).toFixed(1)}B`,
        marketCap: p.mcap,
      };
    }

    return {
      tokens: result,
      timestamp: new Date().toISOString(),
      source: "BITE Market Crypto Feed",
    };
  },
};
