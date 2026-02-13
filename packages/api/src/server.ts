import express from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { registry } from "./services/registry.js";
import { testCryptoRoundTrip, isRealBite } from "./services/crypto.js";

// Demo sellers
import { weatherSeller } from "./sellers/weather.js";
import { cryptoPricesSeller } from "./sellers/crypto-prices.js";
import { tradingSignalsSeller } from "./sellers/trading-signals.js";

// Routes
import { registryRouter } from "./routes/registry.routes.js";
import { queryRouter } from "./routes/query.routes.js";
import { dataRouter } from "./routes/data.routes.js";
import { eventsRouter } from "./routes/events.routes.js";
import { faucetRouter } from "./routes/faucet.routes.js";

// x402 middleware
import { createPaymentMiddleware } from "./middleware/x402.js";

export async function createApp() {
  const app = express();

  // Middleware
  app.use(cors({ exposedHeaders: ["payment-response", "x-payment-response"] }));
  app.use(express.json());

  // Verify crypto round-trip at startup
  const cryptoOk = await testCryptoRoundTrip();
  if (!cryptoOk) {
    console.error("FATAL: BITE crypto round-trip failed. Aborting.");
    process.exit(1);
  }

  // Register demo sellers (must happen before x402 middleware creation)
  registry.register(weatherSeller);
  registry.register(cryptoPricesSeller);
  registry.register(tradingSignalsSeller);
  console.log(`Registered ${registry.list().length} demo sellers`);

  // Mount routes
  app.use("/registry", registryRouter);
  app.use("/query", queryRouter);
  app.use("/events", eventsRouter);
  app.use("/faucet", faucetRouter);

  // x402-gated data route (payment middleware + data handler)
  if (config.SELLER_ADDRESS) {
    const x402Middleware = createPaymentMiddleware();
    app.use("/data", x402Middleware, dataRouter);
    console.log(
      `x402 payment middleware active (payTo: ${config.SELLER_ADDRESS})`,
    );
  } else {
    // No wallet configured — run without payment gating (dev mode)
    console.warn(
      "WARNING: No SELLER_ADDRESS configured. Data routes are NOT payment-gated.",
    );
    app.use("/data", dataRouter);
  }

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      status: "ok",
      sellers: registry.list().length,
      x402: !!config.SELLER_ADDRESS,
      bite: isRealBite() ? "v2-sandbox" : "mockup",
      explorers: {
        baseSepolia: config.BASE_SEPOLIA_EXPLORER,
        biteSandbox: config.BITE_EXPLORER,
      },
    });
  });

  // Serve dashboard static files in production
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dashboardDist = path.resolve(__dirname, "../../dashboard/dist");
  app.use(express.static(dashboardDist));
  // SPA fallback — serve index.html for any non-API route
  app.get("*", (_req, res) => {
    res.sendFile(path.join(dashboardDist, "index.html"));
  });

  return app;
}
