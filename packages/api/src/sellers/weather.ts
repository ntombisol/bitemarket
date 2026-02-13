import type { SellerListing } from "../types.js";

export const weatherSeller: SellerListing = {
  id: "weather-global",
  name: "Global Weather Intelligence",
  description:
    "Real-time weather data and forecasts for any city. Includes temperature, humidity, wind, and 7-day forecast.",
  category: "weather",
  priceUsd: "$0.001",
  sampleResponse: {
    city: "San Francisco",
    temperature: 62,
    conditions: "Partly cloudy",
    humidity: 68,
    wind: "12 mph NW",
    forecast: "Clear skies expected through Thursday",
  },
  async handler(query: string) {
    const q = query.toLowerCase();
    const city = q.includes("sf") || q.includes("san francisco")
      ? "San Francisco"
      : q.includes("ny") || q.includes("new york")
        ? "New York"
        : q.includes("tokyo")
          ? "Tokyo"
          : q.includes("london")
            ? "London"
            : "San Francisco";

    const temps: Record<string, number> = {
      "San Francisco": 58 + Math.random() * 15,
      "New York": 35 + Math.random() * 20,
      Tokyo: 45 + Math.random() * 15,
      London: 40 + Math.random() * 12,
    };

    return {
      city,
      temperature: Math.round(temps[city] * 10) / 10,
      unit: "°F",
      conditions: ["Sunny", "Partly cloudy", "Overcast", "Light rain"][
        Math.floor(Math.random() * 4)
      ],
      humidity: Math.round(45 + Math.random() * 35),
      wind: `${Math.round(5 + Math.random() * 20)} mph ${["N", "NE", "NW", "S", "SE", "SW"][Math.floor(Math.random() * 6)]}`,
      forecast: [
        "Clear skies expected through Thursday",
        "Rain likely on Wednesday",
        "Warming trend this weekend",
        "Fog expected in the morning",
      ][Math.floor(Math.random() * 4)],
      generatedAt: new Date().toISOString(),
      source: "BITE Market Weather Intelligence",
    };
  },
};
