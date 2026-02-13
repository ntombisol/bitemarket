# BITE Market — Encrypted Data Marketplace for AI Agents

> Private data selling with threshold encryption + x402 micropayments

**Hackathon:** SF Agentic Commerce x402 Hackathon  
**Dates:** Feb 11-13, 2026  
**Prize Pool:** $50,000  
**Team:** Tonbi + Scampi 🦐

---

## 🎯 Problem

Current agent data marketplaces (xcl4w2, Clawmart, etc.) sell data **in the clear**:
- Everyone sees what you're buying
- Everyone sees what you're selling
- Competitors can front-run trades based on your queries
- No query privacy = no strategic advantage

For sensitive data (trading signals, research, alpha), this is a dealbreaker.

---

## 💡 Solution

**BITE Market** — an encrypted data vending machine for AI agents.

```
┌─────────────┐     BITE encrypted query     ┌─────────────┐
│   Buyer     │ ──────────────────────────▶  │   Seller    │
│   Agent     │                              │   Agent     │
│             │  ◀────────────────────────── │             │
│             │     Encrypted response       │             │
│             │                              │             │
│             │ ────── x402 payment ───────▶ │             │
│             │                              │             │
│             │  ◀─── Decryption key ─────── │             │
└─────────────┘                              └─────────────┘
                         │
                         ▼
              On-chain: Only payment visible
              Content: Fully encrypted
```

### How It Works

1. **Seller** lists encrypted data endpoint (price, description, sample)
2. **Buyer** sends BITE-encrypted query (hidden from everyone including seller initially)
3. **Seller** processes query, returns BITE-encrypted response
4. **Buyer** pays via x402 (on-chain, but content invisible)
5. **Payment triggers** decryption key release via threshold decryption
6. **Result:** Only buyer and seller see the data; on-chain shows only payment

---

## 🔐 Privacy Tech Stack

### SKALE BITE (Blockchain Integrated Threshold Encryption)
- Validators share BLS threshold encryption public key
- Encrypt with public key → only 2t+1 of 3t+1 nodes can decrypt
- Tx encrypted BEFORE consensus — no mempool visibility
- Library: `@skalenetwork/bite`

### x402 (Coinbase Payment Protocol)
- HTTP 402 Payment Required standard
- Micropayments per request (no subscriptions)
- Stablecoin settlement (USDC)
- Facilitator handles verification

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      BITE Market API                        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Registry   │  │    Query     │  │   Payment    │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  │              │  │              │  │              │     │
│  │ - List data  │  │ - BITE enc   │  │ - x402 flow  │     │
│  │ - Discovery  │  │ - Route req  │  │ - Key escrow │     │
│  │ - Pricing    │  │ - Decrypt    │  │ - Settlement │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                            │
├────────────────────────────────────────────────────────────┤
│                     SKALE Chain (BITE)                     │
├────────────────────────────────────────────────────────────┤
│                     Base (x402 Settlement)                 │
└────────────────────────────────────────────────────────────┘
```

### Components

1. **Registry Service**
   - Sellers register data endpoints
   - Metadata: price, category, sample, schema
   - Discovery API for buyers

2. **Query Service**
   - BITE encryption/decryption wrapper
   - Routes encrypted queries to sellers
   - Handles response encryption

3. **Payment Service**
   - x402 facilitator integration
   - Escrows decryption keys
   - Releases key on payment confirmation

---

## 📋 MVP Scope (3 Days)

### Day 1: Infrastructure
- [ ] Set up SKALE chain connection
- [ ] Integrate `@skalenetwork/bite` library
- [ ] Basic x402 seller middleware
- [ ] Project scaffolding (TypeScript, Express)

### Day 2: Core Flow
- [ ] Seller registration endpoint
- [ ] Encrypted query flow
- [ ] Payment → key release logic
- [ ] Basic buyer SDK

### Day 3: Demo & Polish
- [ ] Dashboard showing encrypted flows
- [ ] 2-3 demo data sellers (weather, prices, signals)
- [ ] Demo video
- [ ] Documentation

---

## 🎪 Demo Scenario

**"Private Alpha Purchase"**

1. Trading agent wants to buy signal data
2. Agent queries BITE Market: "Give me SOL price predictions"
3. Query is BITE-encrypted — seller can't see exact request until processed
4. Seller returns encrypted response
5. Agent pays 0.01 USDC via x402
6. Decryption key released
7. Agent decrypts and gets signals

**What judges see:**
- On-chain: Just a 0.01 USDC payment
- Off-chain: Full encrypted data flow
- Dashboard: Visualization of privacy in action

---

## 🏆 Sponsor Appeal

| Sponsor | Why They'll Love It |
|---------|---------------------|
| **SKALE** | First BITE use case for data commerce (not just mempool) |
| **Coinbase** | x402 for sensitive data = massive new market |
| **Google** | Agent privacy is frontier; A2A with encryption |
| **Edge & Node** | Human oversight of private agent commerce |
| **Vodafone** | IoT data privacy (device → agent sales) |
| **Virtuals** | Novel agent capability worth owning |

---

## 🔧 Tech Requirements

### Dependencies
```json
{
  "@skalenetwork/bite": "latest",
  "x402-client": "latest",
  "express": "^4.18",
  "ethers": "^6.0",
  "typescript": "^5.0"
}
```

### Environment
- SKALE Chain RPC (testnet)
- Base RPC (for x402 settlement)
- Wallet with test tokens

---

## 📊 Success Metrics

- [ ] End-to-end encrypted query flow working
- [ ] x402 payment triggers key release
- [ ] Dashboard shows privacy guarantees
- [ ] Demo video under 3 minutes
- [ ] At least 2 sample data sellers

---

## 🚀 Future Vision (Post-Hackathon)

1. **Multi-seller aggregation** — query multiple sources, pay once
2. **Reputation system** — track seller accuracy (encrypted reviews)
3. **Subscription model** — recurring encrypted data feeds
4. **ZK proofs** — prove data quality without revealing content
5. **Cross-chain** — BITE on SKALE, settle on any x402-supported chain

---

## 📁 Project Structure

```
bite-market/
├── SPEC.md              # This file
├── README.md            # Setup & usage
├── packages/
│   ├── api/             # Express API server
│   ├── sdk/             # Buyer/seller SDK
│   └── dashboard/       # Demo UI
├── contracts/           # Any on-chain components
└── demo/                # Demo data sellers
```

---

## 🦐 Notes

- BITE is threshold encryption, not ZK — data IS revealed to buyer after payment
- Privacy is for the transaction, not permanent secrecy
- x402 handles payment verification, we handle key escrow
- SKALE is EVM-compatible — can use familiar tooling

---

*Created: 2026-02-06*  
*Hackathon: SF x402 (Feb 11-13)*
