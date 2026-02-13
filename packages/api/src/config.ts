import dotenv from "dotenv";
dotenv.config();

export const config = {
  PORT: parseInt(process.env.PORT || "4021", 10),
  SELLER_PRIVATE_KEY: process.env.SELLER_PRIVATE_KEY || "",
  SELLER_ADDRESS: process.env.SELLER_ADDRESS || "",
  BUYER_PRIVATE_KEY: process.env.BUYER_PRIVATE_KEY || "",
  FACILITATOR_URL:
    process.env.FACILITATOR_URL || "https://x402.org/facilitator",
  // Base Sepolia (x402 payments)
  NETWORK: "eip155:84532" as const,
  USDC_ADDRESS: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  // SKALE BITE V2 Sandbox (threshold encryption)
  BITE_RPC: process.env.BITE_RPC || "https://base-sepolia-testnet.skalenodes.com/v1/bite-v2-sandbox-2",
  BITE_CHAIN_ID: 103698795,
  BITE_ADDRESS: "0x42495445204D452049274d20454e435259505444" as `0x${string}`,
  BITE_GAS_LIMIT: "0x493e0",
  // Block explorers
  BASE_SEPOLIA_EXPLORER: "https://sepolia.basescan.org",
  BITE_EXPLORER: "https://base-sepolia-testnet-explorer.skalenodes.com:10032",
} as const;
