import { createApp } from "./server.js";
import { config } from "./config.js";

async function main() {
  const app = await createApp();

  app.listen(config.PORT, () => {
    console.log(`\n  BITE Market API running on http://localhost:${config.PORT}`);
    console.log(`  Registry:  GET  http://localhost:${config.PORT}/registry`);
    console.log(`  Query:     POST http://localhost:${config.PORT}/query`);
    console.log(`  Demo:      POST http://localhost:${config.PORT}/query/demo`);
    console.log(`  Events:    GET  http://localhost:${config.PORT}/events`);
    console.log(`  Health:    GET  http://localhost:${config.PORT}/health`);
    console.log();
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
