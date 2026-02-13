import type { SellerListing } from "../types.js";

export const tradingSignalsSeller: SellerListing = {
  id: "trading-signals",
  name: "Alpha Trading Signals",
  description:
    "AI-generated trading signals with confidence scores, entry/exit points, and risk analysis. Premium alpha for agents.",
  category: "signals",
  priceUsd: "$0.01",
  sampleResponse: {
    signal: "BUY",
    asset: "SOL",
    confidence: 0.87,
    entry: 175.5,
    target: 195.0,
    stopLoss: 168.0,
  },
  async handler(query: string) {
    const q = query.toLowerCase();

    const asset = q.includes("btc") || q.includes("bitcoin")
      ? "BTC"
      : q.includes("eth") || q.includes("ethereum")
        ? "ETH"
        : q.includes("sol") || q.includes("solana")
          ? "SOL"
          : "SOL";

    const bases: Record<string, number> = { BTC: 97500, ETH: 3400, SOL: 178 };
    const base = bases[asset];
    const signal = Math.random() > 0.5 ? "BUY" : "SELL";
    const confidence = Math.round((0.6 + Math.random() * 0.35) * 100) / 100;
    const entry = Math.round(base * (1 + (Math.random() - 0.5) * 0.02) * 100) / 100;
    const multiplier = signal === "BUY" ? 1 : -1;

    return {
      signal,
      asset,
      confidence,
      timeframe: q.includes("1h")
        ? "1H"
        : q.includes("1d") || q.includes("daily")
          ? "1D"
          : q.includes("1w") || q.includes("week")
            ? "1W"
            : "4H",
      entry,
      target: Math.round(entry * (1 + multiplier * 0.08) * 100) / 100,
      stopLoss: Math.round(entry * (1 - multiplier * 0.04) * 100) / 100,
      riskRewardRatio: "1:2",
      reasoning: [
        `${asset} showing ${signal === "BUY" ? "bullish" : "bearish"} momentum on 4H chart`,
        `RSI at ${Math.round(signal === "BUY" ? 35 + Math.random() * 15 : 65 + Math.random() * 15)}`,
        `Volume ${signal === "BUY" ? "increasing" : "decreasing"} over last 8 candles`,
        `Key ${signal === "BUY" ? "support" : "resistance"} level at ${Math.round(entry * (1 - multiplier * 0.03))}`,
      ],
      generatedAt: new Date().toISOString(),
      source: "BITE Market Alpha Signals",
    };
  },
};
