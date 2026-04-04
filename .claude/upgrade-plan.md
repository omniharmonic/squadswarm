# SquadSwarm Production Upgrade Plan

**Author:** Claude (Lead Engineer)
**Date:** 2026-04-04
**Status:** Ready for sprint
**Goal:** Transform SquadSwarm from a functional prototype into a consumer-ready collaborative work platform

---

## Current State Assessment

The app has the skeleton of every feature, but many interactive components are shallow — they render data but don't support the full workflow a real user needs. The core issues fall into 5 categories:

1. **Broken UX flows** — things that crash or show wrong state
2. **Shallow features** — UI exists but doesn't do anything real
3. **Missing collaboration infrastructure** — no external tool links, no project context for agents
4. **Incomplete payment pipeline** — Stripe/crypto are stubs
5. **Trust system not connected to TrustGraph** — our EAS implementation needs to follow the canonical pattern

---

## Workstream Architecture (5 parallel tracks)

```
WS-1: Bug Fixes & UX Polish ──────── No dependencies (can start immediately)
WS-2: Real Collaboration Engine ───── No dependencies (can start immediately)
WS-3: Payment Pipeline ───────────── No dependencies (can start immediately)
WS-4: TrustGraph Integration ─────── Depends on WS-3 (needs contract completion)
WS-5: Agent Experience (MCP) ──────── Depends on WS-2 (needs collaboration links)
```

---

## WS-1: Bug Fixes & UX Polish

**Goal:** Fix every reported bug and make the existing UI solid.
**Priority:** CRITICAL — must complete first
**Effort:** ~4 hours
**Can parallelize:** YES — each fix is independent

### WS-1-T01: Scope page shows "Review Bids" after bid accepted
- **File:** `apps/web/app/(app)/scopes/[scopeId]/page.tsx`
- **Bug:** When scope status is `contracted`, still shows "Review Bids" CTA
- **Fix:** Check `scope.status` — if `contracted` or `completed`, show "View Contract" link instead. Look up the contract by scope ID.

### WS-1-T02: Squad creation crashes for web3 wallet users
- **File:** `apps/web/app/(app)/squads/new/page.tsx`
- **Bug:** `Cannot read properties of undefined (reading 'length')` — likely the governance model options or the squad list response
- **Fix:** Add null checks on all array operations. The web3 session might not have `displayName`, causing a `.length` call on undefined somewhere in the squad creation or redirect flow.

### WS-1-T03: Activity feed shows raw action names + NaN timestamps
- **File:** `apps/web/app/(app)/dashboard/page.tsx`
- **Bug:** Shows "deliverable_approved" instead of "Deliverable approved" and "NaNd ago"
- **Fix:**
  - Create an action name formatter: `deliverable_approved` → "Deliverable approved", `deliverable_status_changed` → "Status changed", etc.
  - Fix timestamp parsing — the activity log timestamps may be in a format that `new Date()` can't parse, or the relative time calculation is wrong.
  - Include entity name: "Architectural Review approved" not just "Deliverable approved"

### WS-1-T04: Empty acceptance criteria checkboxes in client review
- **File:** `apps/web/app/(app)/contracts/[contractId]/review/page.tsx`
- **Bug:** Acceptance criteria show as empty checkboxes with no text
- **Fix:** The criteria are stored as JSONB in the deliverable's `acceptanceCriteria` column. Check the shape — it might be `[{description, measurableCondition}]` but the review page expects a different format. Parse correctly.

### WS-1-T05: favicon.ico 404
- **Fix:** Convert `app/icon.svg` to also generate a `favicon.ico` or add a static one in `public/`.

### WS-1-T06: Auto-approve / "Skip assessment" option on scope submission
- **File:** `apps/web/app/(app)/scopes/[scopeId]/analyze/page.tsx`
- **Fix:** Add a button "Skip to Work Plan" that sends a message like "Generate a work plan directly without doing a sufficiency assessment first."

---

## WS-2: Real Collaboration Engine

**Goal:** Make contracts actual collaboration spaces, not just status trackers.
**Priority:** HIGH
**Effort:** ~8 hours
**Can parallelize:** YES — each task is independent

### WS-2-T01: Collaboration Links (External Tool Integration)
- **New DB column:** Add `collaboration_links` (JSONB) to `contracts` table
- **New API:** `PATCH /api/contracts/[id]/links` — add/remove links
- **UI on contract overview:** A "Collaboration Spaces" section showing linked tools:
  - Notion workspace
  - GitHub repo
  - Google Drive folder
  - Figma project
  - Discord/Slack channel
  - Custom URL
- Each link has: icon, label, URL, added by whom
- Squad members can add/edit links; client can view
- **MCP tool:** `get_collaboration_links` — returns all links for the contract

### WS-2-T02: Project.md for Agent Context
- **New DB column:** Add `project_context` (TEXT) to `contracts` table
- **New API:** `GET/PUT /api/contracts/[id]/context` — read/write the project context
- **UI:** A "Project Context" tab/section on the contract page with a markdown editor
- **MCP resource:** Expose as `squadswarm://project-context/{contractId}` — agents read this first to understand the project, where files are, collaboration links, team roles, etc.
- **Auto-generated on contract creation:** Include scope narrative, work plan summary, team roster, collaboration links

### WS-2-T03: Per-Workstream Discussion Channels
- **Current state:** Only "General" channel exists
- **Fix:** When a contract is created with workstreams, auto-create channels for each workstream
- **UI:** Discussion sidebar shows: General + one channel per workstream
- **Filter messages:** Already supported by `channelType` + `channelId` in the API

### WS-2-T04: Deliverable Submission Flow
- **Current state:** Status can be moved to "in_review" but there's no formal submission
- **Add:** When moving to "in_review", prompt for:
  - Submission notes (text)
  - Attached files (link to uploaded files)
  - Checkbox: "I confirm this meets the acceptance criteria"
- Store submission metadata in activity log

### WS-2-T05: Revision Request with Specific Feedback
- **Current state:** "Request Revision" just changes status
- **Add:** Require a comment/reason when requesting revision
- Track revision count against the contract's `feedbackRoundsTotal`
- Show warning on last revision: "This is your final revision request"

---

## WS-3: Payment Pipeline

**Goal:** Make payments actually flow — Stripe for fiat, smart contracts for crypto.
**Priority:** HIGH
**Effort:** ~6 hours
**Can parallelize:** YES with WS-1 and WS-2

### WS-3-T01: Stripe Integration (Real)
- Install `stripe` package
- Create Stripe customer on user signup (or lazily on first payment)
- **Deposit flow:** Create Stripe Checkout session → redirect to Stripe → webhook confirms payment → contract activates
- **Release flow:** On contract completion → Stripe Transfer to squad's connected account
- Requires: Stripe account setup (user action), webhook endpoint

### WS-3-T02: Squad Multisig Address
- **New UI on squad settings:** "Payment Address" field where the squad enters their multisig wallet address (Gnosis Safe, etc.)
- Store in `squads.multisigAddress` (column already exists)
- **No Safe deployment from our app** — squads create their own Safe and paste the address
- When payment mode is `crypto`, the escrow contract sends to this address

### WS-3-T03: Crypto Escrow Integration
- Deploy `SquadSwarmEscrow.sol` to Base Sepolia
- Wire the frontend: when squad has `paymentMode === 'crypto'`:
  - Show "Fund with USDC" button that triggers wallet transaction
  - Uses the escrow contract's `deposit()` function
  - On completion: calls `complete()` which releases funds to squad's multisig
- Progressive: crypto path only available when both parties have wallets

### WS-3-T04: Payment Dashboard on Contract
- Show real payment status: deposited amount, released amount, escrowed amount
- For Stripe: show Stripe payment links and status
- For crypto: show on-chain transaction links (Basescan)

---

## WS-4: TrustGraph Integration

**Goal:** Implement trust scoring following the TrustGraph canonical pattern.
**Priority:** MEDIUM (depends on WS-3 for contract completion flow)
**Effort:** ~5 hours
**Depends on:** WS-3 (needs real contract completion to trigger attestations)

### WS-4-T01: Follow TrustGraph Architecture
The TrustGraph repo uses:
- **EAS attestations** as the source of truth for trust
- **Weighted graph computation** — trust flows through attestation chains
- **Schema-specific scoring** — different attestation types have different weights
- **Decay over time** — older attestations carry less weight

Our implementation should:
1. On contract completion → create EAS attestation (on-chain if both parties have wallets, off-chain otherwise)
2. Trust score = weighted sum of: completed contracts × client ratings × recency
3. Display attestation history on profiles with links to EAS explorer

### WS-4-T02: Real Attestation Flow
- On contract completion:
  - Create `ContractCompletion` attestation (squad-level)
  - If client rates: create `ClientSatisfaction` attestation
  - For each agent: create `AgentCapability` attestation
- Store attestation UIDs in a new `attestations` table
- Link from profile to EAS explorer

### WS-4-T03: Trust Score Computation (TrustGraph PageRank-style)
Following the Lay3rLabs/TrustGraph canonical implementation:
- **Algorithm:** Modified PageRank with trust-aware weighting
  - `PR(i) = (1-d)/N + d * Σ(PR(j) * W(j,i) / L(j))`
  - Damping factor d=0.85, max iterations=100, convergence=1e-6
- **Trusted seeds:** Platform-verified accounts get multiplied edge weights (2-5x)
- **Edge weights from attestations:**
  - ContractCompletion attestation: base weight = contract amount / 10000
  - ClientSatisfaction attestation: multiplier = rating / 5
  - Dispute resolution: negative weight
- **Recency decay:** Attestations >6 months old carry 50% weight
- **Sybil resistance:** Trust propagates from seeds; isolated spam rings can't inflate scores
- Normalize to 0-100 scale
- Compute for both users AND squads
- Store in `trust_score` column, recompute on each new attestation

### WS-4-T04: Trust Display Throughout UI
- Squad profiles: show attestation count + trust score badge
- Scope board: show required trust threshold vs viewer's score
- Bid review: show squad's trust score with breakdown

---

## WS-5: Agent Experience (MCP)

**Goal:** Make agents genuinely useful collaborators, not just API consumers.
**Priority:** MEDIUM
**Effort:** ~4 hours
**Depends on:** WS-2 (needs collaboration links and project context)

### WS-5-T01: Project Context MCP Resource
- Expose `project_context` as an MCP resource
- Include: scope narrative, work plan, team roster, collaboration links, acceptance criteria for all deliverables
- Agents read this first to understand what they're working on

### WS-5-T02: Wire MCP Tools to Real DB
- Many tools return stubs — wire them all to real Drizzle queries
- `get_my_tasks` → query deliverables where assignedAgentId matches
- `update_task_status` → call the same service as the REST API
- `post_message` → insert into messages table with agent attribution
- `upload_file` → upload to Supabase Storage

### WS-5-T03: MCP Integration Test Script
- Script that: registers test agent → connects → gets tasks → updates status → posts message
- Verify the full agent workflow against production

---

## Execution Order

**Swarm 1 (immediate — no dependencies):**
- WS-1: All bug fixes (6 tasks, independent)
- WS-2-T01: Collaboration links
- WS-2-T02: Project.md
- WS-3-T02: Multisig address input

**Swarm 2 (can start immediately, longer tasks):**
- WS-2-T03: Workstream channels
- WS-2-T04: Deliverable submission flow
- WS-2-T05: Revision feedback
- WS-3-T01: Stripe integration

**Swarm 3 (after Swarm 1 core is done):**
- WS-3-T03: Crypto escrow
- WS-3-T04: Payment dashboard
- WS-4-T01: TrustGraph architecture
- WS-4-T02: Attestation flow

**Swarm 4 (after WS-2 and WS-4):**
- WS-4-T03: Trust score computation
- WS-4-T04: Trust display
- WS-5-T01: Project context resource
- WS-5-T02: Wire MCP tools
- WS-5-T03: Integration test

---

## Database Migrations Needed

1. Add `collaboration_links JSONB DEFAULT '[]'` to `contracts`
2. Add `project_context TEXT` to `contracts`
3. Create `attestations` table: `id, contractId, userId, squadId, agentId, type, easUid, schemaUid, data JSONB, createdAt`
4. Add `stripeCustomerId TEXT` to `users`
5. Add `stripeConnectId TEXT` to `squads`

---

## Total Effort Estimate

| Workstream | Tasks | Effort | Parallelizable |
|-----------|-------|--------|---------------|
| WS-1 Bug Fixes | 6 | 4h | Fully |
| WS-2 Collaboration | 5 | 8h | Mostly |
| WS-3 Payments | 4 | 6h | Partially |
| WS-4 TrustGraph | 4 | 5h | After WS-3 |
| WS-5 MCP | 3 | 4h | After WS-2 |
| **Total** | **22** | **~27h** | **4 parallel swarms** |

With aggressive parallelization (4 swarms), this can be completed in approximately **8-10 hours of wall time**.
