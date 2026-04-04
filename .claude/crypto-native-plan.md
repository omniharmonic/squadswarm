# SquadSwarm Crypto-Native Upgrade Plan

**Date:** 2026-04-04
**Goal:** Crypto-native payments, real EAS attestations, fixed crashes, Playwright-verified

---

## Architecture Decision: Crypto-Only Payments

Per Benjamin's direction:
- **Remove Stripe entirely** — no fiat payment processing, no money processor license issues
- **USDC on Base** as primary payment currency
- **Optional onramp** via MoonPay/Transak widget for fiat→crypto conversion
- **All payments flow through SquadSwarmEscrow.sol** on-chain
- **Payouts per deliverable** — squads get paid as work is approved, not just at contract end
- **Configurable squad multisig split** — percentage to multisig treasury

---

## Swarm 1: Crash Fixes (3 agents, immediate, ~2h)

### S1-A1: Squad profile crash + /api/auth/me 404
**Files:** `squads/[squadId]/page.tsx`, `api/squads/[squadId]/route.ts`
**Bugs:**
- `squad.agents` is undefined — API returns `agentCount` not `agents[]`
- `/api/auth/me` 404 — should be `/api/users/me`
**Fix:**
1. API: fetch agents for squad members and return as `agents[]`
2. Page: add `squad.agents?.map()` null safety
3. Replace all `/api/auth/me` with `/api/users/me` across entire codebase
4. **Playwright verify:** Navigate to squad page, verify no crash, verify agents display

### S1-A2: Wallet connect requires two attempts
**File:** `components/web3-provider.tsx`
**Bug:** React state update is async — `address` is null right after `connect()` returns
**Fix:**
1. `connect()` returns the address directly: `async connect(): Promise<Address>`
2. Callers use the returned address instead of waiting for state
3. Add `useEffect` that re-checks `window.ethereum` accounts on mount (auto-reconnect)
4. **Playwright verify:** Navigate to login, click "Sign in with Wallet", verify MetaMask popup, verify connection on first attempt

### S1-A3: Trust scores not updating after ratings
**Files:** `api/contracts/[contractId]/rate/route.ts`, `api/users/me/trust-score/route.ts`
**Bug:** Rating endpoint stores data but never triggers trust recalculation
**Fix:**
1. After storing rating, call the trust score recalculation logic inline
2. Update squad trust score + all squad member scores
3. **Playwright verify:** Rate a completed contract, navigate to profile, verify trust score changed

---

## Swarm 2: Crypto-Native Payments (2 agents, immediate, ~4h)

### S2-A1: Remove Stripe, wire crypto escrow to frontend
**Files to delete:** `lib/stripe.ts`
**Files to modify:** `api/contracts/[contractId]/deposit/route.ts`, `contracts/[contractId]/page.tsx`
**Architecture:**
- Deposit flow is CLIENT-SIDE (user signs the transaction in their wallet)
- The API just records the on-chain state
- Flow:
  1. Client clicks "Fund with USDC"
  2. Frontend calls `depositToEscrow()` from `packages/web3/src/escrow.ts`
  3. User approves USDC transfer in MetaMask
  4. On confirmation, frontend calls `POST /api/contracts/[id]/deposit` with `{ txHash }`
  5. API updates contract status to `active`

**Deliverable-based payouts:**
- When a deliverable is approved, release proportional payment
- Formula: `deliverable_payment = (total_amount * deliverable_effort) / total_effort`
- Frontend calls `releaseMilestone()` on the escrow contract
- API records the release

**Squad treasury split:**
- Squad configures: X% to multisig, Y% held for individual distribution
- `PaymentSplitter.sol` handles the actual distribution
- Individual splits based on squad's revenue split config

### S2-A2: Onramp widget integration
**New file:** `apps/web/components/onramp-widget.tsx`
**Implementation:**
- Embed MoonPay or Transak widget as an iframe/popup
- Triggered from "Need USDC?" button on the deposit page
- Pre-fills: amount needed, destination (escrow contract address), token (USDC on Base)
- No server-side processing — widget handles KYC and fiat conversion
- Link: `https://buy.moonpay.com/?apiKey=...&currencyCode=usdc_base&walletAddress=...`

---

## Swarm 3: Real EAS Attestations (1 agent, after S1-A3, ~3h)

### S3-A1: Wire EAS to contract completion
**Files:** `packages/web3/src/eas/`, `api/contracts/[contractId]/complete/route.ts`
**Implementation:**
- On contract completion (when all deliverables approved + client confirms):
  1. Create ContractCompletion attestation on Base via EAS
  2. If client rated: create ClientSatisfaction attestation
  3. For each contributing agent: create AgentCapability attestation
- Store attestation UIDs in a new `attestations` table (need migration)
- Display attestation badges on profiles with EAS Explorer links
- For users without wallets: store attestation data off-chain in DB (can be brought on-chain later)

**TrustGraph integration:**
- After attestations created, rebuild trust graph edges
- Run PageRank computation from `packages/web3/src/trust-graph.ts`
- Update trust scores for all participants

---

## Swarm 4: Playwright Verification (1 agent, after S1+S2, ~2h)

### S4-A1: Full end-to-end Playwright test of every user flow
Using the Playwright MCP, verify IN THE BROWSER:

1. **New user signup** — email → verify → dashboard (no crashes)
2. **Squad creation** — fill form → create → profile loads (no undefined crashes)
3. **Agent registration** — register → API key shown → agent appears in list
4. **Scope submission** — fill form → submit → AI analysis → auto-improve → work plan → publish
5. **Scope board** — published scope appears → click → detail page loads
6. **Bid creation** — start bid → fill form → save → submit
7. **Bid review** — as client, view bids → accept bid → contract created
8. **Contract funded** — fund contract (mock for now, verify UI flow)
9. **Work management** — claim deliverable → start → submit for review → approve
10. **Discussion** — send message → appears in feed
11. **Client review** — approve deliverable → verify it moves to approved
12. **Contract completion** — all approved → complete → verify status
13. **Squad finances** — verify payment history shows real data
14. **Profile** — verify trust score, attestation section

---

## DB Migrations Needed

1. Create `attestations` table:
```sql
CREATE TABLE attestations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id),
  user_id UUID REFERENCES users(id),
  squad_id UUID REFERENCES squads(id),
  agent_id UUID REFERENCES agents(id),
  type TEXT NOT NULL,
  eas_uid TEXT,
  schema_uid TEXT,
  data JSONB,
  on_chain BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Execution Order

```
IMMEDIATE (parallel):
  S1-A1: Squad crash fix ────────────────── 30min
  S1-A2: Wallet fix ─────────────────────── 30min
  S1-A3: Trust score fix ────────────────── 30min
  S2-A1: Crypto payments ────────────────── 3h
  S2-A2: Onramp widget ──────────────────── 1h

AFTER S1 + S2:
  S3-A1: EAS attestations ───────────────── 3h

AFTER ALL:
  S4-A1: Full Playwright verification ──── 2h
```

**Total wall time:** ~5h with max parallelization
**Total effort:** ~12h across 7 agent tasks
