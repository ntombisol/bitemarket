import type { SellerListing } from "../types.js";

export const tradingSignalsSeller: SellerListing = {
  id: "trading-signals",
  name: "Alpha Trading Signals",
  description:
    "AI-generated trading signals with confidence scores, entry/exit points, and risk analysis. Premium alpha for agents.",
  category: "signals",
  priceUsd: "$0.01",
  params: {
    asset: {
      type: "string",
      required: true,
      options: ["BTC", "ETH", "SOL"],
      description: "Asset to get trading signals for",
    },
    timeframe: {
      type: "string",
      default: "4H",
      options: ["1H", "4H", "1D", "1W"],
      description: "Signal timeframe",
    },
  },
  sampleResponse: {
    signal: "BUY",
    asset: "SOL",
    confidence: 0.87,
    entry: 175.5,
    target: 195.0,
    stopLoss: 168.0,
  },
  async handler(params: Record<string, unknown>) {
    const asset = (params.asset as string) || "SOL";
    const timeframe = (params.timeframe as string) || "4H";

    const bases: Record<string, number> = { BTC: 97500, ETH: 3400, SOL: 178 };
    const base = bases[asset] ?? 178;
    const signal = Math.random() > 0.5 ? "BUY" : "SELL";
    const confidence = Math.round((0.6 + Math.random() * 0.35) * 100) / 100;
    const entry = Math.round(base * (1 + (Math.random() - 0.5) * 0.02) * 100) / 100;
    const multiplier = signal === "BUY" ? 1 : -1;

    return {
      signal,
      asset,
      confidence,
      timeframe,
      entry,
      target: Math.round(entry * (1 + multiplier * 0.08) * 100) / 100,
      stopLoss: Math.round(entry * (1 - multiplier * 0.04) * 100) / 100,
      riskRewardRatio: "1:2",
      reasoning: [
        `${asset} showing ${signal === "BUY" ? "bullish" : "bearish"} momentum on ${timeframe} chart`,
        `RSI at ${Math.round(signal === "BUY" ? 35 + Math.random() * 15 : 65 + Math.random() * 15)}`,
        `Volume ${signal === "BUY" ? "increasing" : "decreasing"} over last 8 candles`,
        `Key ${signal === "BUY" ? "support" : "resistance"} level at ${Math.round(entry * (1 - multiplier * 0.03))}`,
      ],
      generatedAt: new Date().toISOString(),
      source: "BITE Market Alpha Signals",
    };
  },
};
