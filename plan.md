# Ciphermarket — Task Plan

## DAY 1: End-to-End Flow (Feb 11)

### Phase 1: Scaffolding ✅
- [x] 1.1 Root `package.json` with npm workspaces (`packages/*`, `demo`)
- [x] 1.2 `tsconfig.base.json` — shared TypeScript config (ES2022, NodeNext, strict)
- [x] 1.3 `packages/api/package.json` + `tsconfig.json`
- [x] 1.4 `packages/sdk/package.json` + `tsconfig.json`
- [x] 1.5 `.env.example` + `.env` template
- [x] 1.6 `npm install` — verify all deps resolve

### Phase 2: Core Services ✅
- [x] 1.7 `packages/api/src/types.ts`
- [x] 1.8 `packages/api/src/config.ts`
- [x] 1.9 `packages/api/src/services/crypto.ts` — BITEMockup + custom mockupDecrypt
- [x] 1.10 **TEST**: encrypt→decrypt round-trip PASSED (3/3 tests)
- [x] 1.11 `packages/api/src/services/events.ts`
- [x] 1.12 `packages/api/src/services/registry.ts`

### Phase 3: Demo Sellers ✅
- [x] 1.13 weather seller
- [x] 1.14 crypto prices seller
- [x] 1.15 trading signals seller

### Phase 4: Routes + Middleware ✅
- [x] 1.16 x402 middleware
- [x] 1.17 registry routes
- [x] 1.18 query routes (+ /query/demo)
- [x] 1.19 data routes (x402-gated)
- [x] 1.20 SSE events route

### Phase 5: Server Assembly ✅
- [x] 1.21 server.ts
- [x] 1.22 index.ts
- [x] 1.23 **TEST**: Server starts, registry returns 3 sellers

### Phase 6: Buyer SDK ✅
- [x] 1.24-1.27 SDK with CiphermarketClient, crypto, types, exports

### Phase 7: Demo + Verification ✅
- [x] 1.28 demo/run-demo.ts — working with colored output
- [x] 1.29 **TEST**: Full flow works (encrypt → query → decrypt → data)
- [x] 1.30 **TEST**: x402 payment on Base Sepolia — WORKING with real USDC transfers

---

## DAY 2: Dashboard + x402 Integration (Feb 11-12)

### Phase 8: Dashboard Scaffold ✅
- [x] 2.1 `packages/dashboard/` — Vite + React + TypeScript scaffold
- [x] 2.2 Tailwind CSS setup (dark theme, custom brand colors, IBM Plex fonts, noise texture)
- [x] 2.3 Vite proxy config (direct routes → `http://localhost:4021`)

### Phase 9: Hooks + Data Layer ✅
- [x] 2.4 `hooks/useEventStream.ts` — SSE hook with auto-reconnect, dedup, 200 event buffer
- [x] 2.5 `hooks/useRegistry.ts` — fetch sellers from API

### Phase 10: Dashboard Components ✅
- [x] 2.7 `components/Layout.tsx` — dark shell, branded header, connection status
- [x] 2.8 `components/FlowVisualization.tsx` — animated Buyer→Market→Seller with data packets
- [x] 2.9 `components/EventLog.tsx` — terminal-style real-time event stream
- [x] 2.10 `components/QueryPanel.tsx` — seller select, query input, loading states, results
- [x] 2.11 `components/SellerCatalog.tsx` — seller cards with category icons + prices
- [x] 2.12 `components/EncryptionDemo.tsx` — side-by-side cipher vs plaintext with scramble animation
- [x] 2.13 `App.tsx` — 2/3 + 1/3 grid layout composing all components
- [x] 2.14 **TEST**: Dashboard loads, TypeScript compiles clean

### Phase 11: x402 Payment Integration ✅
- [x] 2.15 Fixed x402 route matching (routes relative to mount point, not absolute)
- [x] 2.16 Fixed ExactEvmScheme import (`@x402/evm/exact/server` for server, `@x402/evm/exact/client` for client)
- [x] 2.17 Server-side x402 payment in `/query/demo` using `wrapFetchWithPayment` + buyer wallet
- [x] 2.18 Fixed private key format handling (auto-add `0x` prefix)
- [x] 2.19 **TEST**: x402 returns 402 without payment, 200 with payment
- [x] 2.20 **TEST**: Real USDC transfer on Base Sepolia confirmed

---

## DAY 3: Polish + Demo (Feb 12-13)

### Phase 12: Polish
- [ ] 3.1 Visual polish — animations, loading states, transitions
- [ ] 3.2 Error handling — timeouts, invalid IDs, facilitator down
- [ ] 3.3 Responsive layout (projector-friendly)
- [ ] 3.4 Add tx hash / block explorer link to dashboard after payment

### Phase 13: Demo Assets
- [ ] 3.5 `demo/demo-buyer.ts` — automated demo scenario with timed queries
- [ ] 3.6 README.md — setup, architecture diagram, screenshots
- [ ] 3.7 (Optional) Agent-to-agent demo — two processes, A2A narrative

### Phase 14: Ship
- [ ] 3.8 Demo video — under 3 minutes
- [ ] 3.9 Final testing — full flow with real x402 payments
- [ ] 3.10 If SKALE sponsor provides FAIR testnet endpoint: swap BITEMockup → BITE
- [ ] 3.11 Deployment (Railway/Render) for judges to test live

---

## POST-HACKATHON: On-Chain Contracts

### Near-term (add after core is stable)
- [ ] **Seller Registry Contract** (Base or SKALE) — on-chain listing of sellers with metadata, prices, and endpoints. Replaces in-memory Map. Registry interface (`get`, `list`, `register`) stays the same, swap backing store to contract reads.
- [ ] **Payment Receipt Contract** (Base) — logs each marketplace transaction (seller, buyer, amount, timestamp, encrypted query hash) on-chain for auditability. Bolt on as a post-settlement hook after x402 payment completes.

### Future Development (requires BITE-enabled chain)
- [ ] **Escrow Contract** (SKALE FAIR chain) — fundamentally changes the flow: seller posts BITE-encrypted response on-chain → buyer pays via x402 → contract releases threshold decryption key → buyer decrypts client-side. This is the strongest privacy architecture (no trusted server) but requires a live BITE-enabled SKALE chain with threshold decryption support. Currently blocked: no public FAIR testnet endpoint available. When FAIR launches, this becomes the production architecture.
