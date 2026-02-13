import { Router } from "express";
import { registry } from "../services/registry.js";

export const registryRouter = Router();

registryRouter.get("/", (_req, res) => {
  res.json({ sellers: registry.listInfo() });
});

registryRouter.get("/:id", (req, res) => {
  const seller = registry.getInfo(req.params.id);
  if (!seller) {
    res.status(404).json({ error: "Seller not found" });
    return;
  }
  res.json(seller);
});
