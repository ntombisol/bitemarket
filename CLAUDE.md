# Ciphermarket — Project Guide

## What This Is

Encrypted data marketplace for AI agents. Hackathon project (SF x402, Feb 11-13 2026).
Buyers purchase data privately: queries encrypted with SKALE BITE, payments via Coinbase x402 micropayments.

## Key Design Choices

### Architecture: x402-first
- x402 Express middleware gates data endpoints behind USDC micropayments
- BITE encrypts buyer queries (privacy) and seller responses (until paid)
- After x402 payment verification, server decrypts and returns data
- Single Express server, in-memory storage, no database

### BITE Encryption: Real AES-256-GCM via BITEMockup
- `BITEMockup.encryptMessage()` does REAL AES-256-GCM encryption (via WASM/libBLS)
- The "mockup" = AES key stored in plaintext in output (vs threshold-encrypted in production)
- We wrote `mockupDecrypt()` that extracts the key from BITE's binary format and AES-GCM decrypts
- Production swap: replace `new BITEMockup()` → `new BITE('https://fair-endpoint...')` (one line)
- Binary format: `[0x01][224-byte key slot][12b IV][ciphertext][16b GCM tag]`
- After AES decrypt, strip last 32 bytes (random secret padding)

### x402 Payment: Base Sepolia + Free Facilitator
- Server: `@x402/express` middleware, `@x402/core`, `@x402/evm`
- Client: `@x402/fetch` wraps native fetch with automatic 402 payment handling
- Facilitator: `https://x402.org/facilitator` (free testnet, no API key)
- Network: Base Sepolia (`eip155:84532`), USDC at `0x036CbD53842c5426634e7929541eC2318f3dCF7e`
- **Server-side import**: `ExactEvmScheme` from `@x402/evm/exact/server` (NOT `@x402/evm`)
- **Client-side import**: `ExactEvmScheme` from `@x402/evm/exact/client` (needs signer)
- **Route keys**: relative to mount point (e.g. `GET /weather-global` not `GET /data/weather-global`)
- **Private keys**: handle with or without `0x` prefix (normalize in code)

### Dashboard: React + Vite + Tailwind
- Dark theme, SSE-powered real-time flow visualization
- `/query/demo` endpoint handles full flow server-side: encrypt → process → x402 payment → decrypt
- No private keys needed in browser — server pays using BUYER_PRIVATE_KEY
- Each dashboard query triggers a real USDC transfer on Base Sepolia

## Tech Stack

- TypeScript monorepo (npm workspaces)
- Express API server
- `@skalenetwork/bite` v0.7.1 (BITEMockup class)
- `@ethereumjs/rlp` v10.x (decode BITE envelope — NOT v5.x)
- `@x402/express`, `@x402/core`, `@x402/evm`, `@x402/fetch` — all v2.3.0
- `viem` (wallet/signing for x402)
- React + Vite + Tailwind CSS + Framer Motion (dashboard)

## BITE Mockup Decrypt Constants

```
HEADER_SIZE        = 1      (0x01 byte)
AES_KEY_SIZE       = 32     (bytes 1-32 of key slot)
CIPHERED_KEY_SIZE  = 224    (total key slot: G2=128 + AES=32 + G1=64)
AES_GCM_IV_SIZE    = 12
AES_GCM_TAG_SIZE   = 16
RANDOM_SECRET_SIZE = 32     (stripped after decrypt)
```

## Important Notes

- BITEMockup input MUST be valid hex with even length (use Buffer.from(text, 'utf8').toString('hex'))
- x402 middleware routes must be defined BEFORE Express route handlers
- Demo sellers are registered at startup (before x402 middleware creation)
- x402 `price` field uses dollar format: `"$0.001"`
- x402 route matching uses `req.path` (not `req.originalUrl`) — routes relative to mount point
- If SKALE sponsors provide FAIR testnet endpoint: swap BITEMockup → BITE (one-line change)

## Bugs We Fixed

- `@x402/core@^0.2.2` → must be `^2.3.0` (v2 breaking change)
- `@ethereumjs/rlp@^5.0.2` → must be `^10.0.0` (version jump)
- `server.registerScheme(scheme)` → `server.register(network, scheme)` (2 args)
- x402 route keys `GET /data/foo` → `GET /foo` (relative to Express mount point)
- `ExactEvmScheme` import from `@x402/evm` → `@x402/evm/exact/server` (server vs client export)
- Private key without `0x` prefix → normalize with `key.startsWith("0x") ? key : "0x" + key`

## On-Chain Roadmap

### Post-hackathon (no rearchitecture needed)
- **Seller Registry Contract** (Base or SKALE) — replace in-memory Map with on-chain listings. Same `get/list/register` interface, swap backing store to contract reads.
- **Payment Receipt Contract** (Base) — log each transaction (seller, buyer, amount, encrypted query hash) on-chain. Add as post-settlement hook after x402 payment.

### Future (requires BITE-enabled chain)
- **Escrow Contract** (SKALE FAIR) — encrypted response posted on-chain, payment triggers threshold decryption key release. Removes trusted server from the flow entirely. Blocked until FAIR chain launches with public endpoints.

## Commands

```bash
npm run dev          # Start API server (packages/api)
npm run dashboard    # Start dashboard (packages/dashboard)
npm run demo         # Run end-to-end demo script
```

## Environment Variables

```
SELLER_PRIVATE_KEY   # Wallet receiving payments (hex, with or without 0x prefix)
SELLER_ADDRESS       # Derived from SELLER_PRIVATE_KEY (must include 0x prefix)
BUYER_PRIVATE_KEY    # Wallet making payments (needs Base Sepolia USDC)
FACILITATOR_URL      # Default: https://x402.org/facilitator
PORT                 # Default: 4021
```
