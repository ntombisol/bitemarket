import { Router } from "express";
import { eventBus } from "../services/events.js";

export const eventsRouter = Router();

eventsRouter.get("/", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Send history as initial batch
  const history = eventBus.getHistory();
  for (const event of history) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // Subscribe to new events
  const unsubscribe = eventBus.subscribe((event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // Clean up on client disconnect
  req.on("close", () => {
    unsubscribe();
  });
});
