import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { config } from "../config.js";
import { registry } from "../services/registry.js";
import type { RequestHandler } from "express";

export function createPaymentMiddleware(): RequestHandler {
  const facilitator = new HTTPFacilitatorClient({
    url: config.FACILITATOR_URL,
  });

  const scheme = new ExactEvmScheme();
  const server = new x402ResourceServer(facilitator);
  server.register(config.NETWORK, scheme);

  // Build route config dynamically from registered sellers
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const routes: any = {};
  for (const seller of registry.list()) {
    routes[`GET /${seller.id}`] = {
      accepts: [
        {
          scheme: "exact",
          price: seller.priceUsd,
          network: config.NETWORK,
          payTo: config.SELLER_ADDRESS,
        },
      ],
      description: `Access ${seller.name} data`,
      mimeType: "application/json",
    };
  }

  return paymentMiddleware(routes, server) as RequestHandler;
}
