# SquadSwarm — Production-Readiness Evaluation & First-Principles Improvement Strategy

**Author:** Engineering audit (Claude)
**Date:** 2026-06-09
**Branch:** `claude/elegant-franklin-uxosti`
**Scope:** Full codebase vs. PRD v1.0, with live front-end + back-end testing against a local Postgres instance, plus a first-principles re-examination of the product.

---

## Execution status (updated 2026-06-10)

This document began as an evaluation; the P0/P1 and several P2 items have since
been **implemented, tested, and pushed** to `claude/elegant-franklin-uxosti`.

**Done & verified**
- ✅ **P0 IDOR**: shared authz (`lib/access.ts`); closed bid / squad-roster /
  payment-distribution / confidential-scope leaks. Encoded as a live
  integration suite (6 tests) — non-members now get `403`, owners `200`.
- ✅ **P0 auth**: fail-fast secret loader (`lib/env.ts`, no insecure fallback);
  SIWE server-side single-use nonces (`siwe_nonces` table) — replay rejected
  live; removed magic-link token logging.
- ✅ **P0 migration**: folded the orphaned skills migration into a journaled,
  idempotent `0005`; added a node-postgres migration runner; verified a clean
  DB builds all 27 tables.
- ✅ **P1 AI**: consolidated the duplicated Scope Analyst into `@squadswarm/ai`
  (route is now a thin SSE layer); central model registry (upgraded off
  haiku-3 → sonnet-4.6, Opus via env); prompt-injection delimiting; real
  streaming; Zod validation; `ai_usage_logs` now written.
- ✅ **P1 rate limiting**: auth + analyze endpoints (verified 429 live).
- ✅ **P1 testing/CI**: Vitest (18 unit + 6 integration); a real ESLint flat
  config replacing the broken `next lint` (0 errors); CI expanded to
  quality + integration (Postgres service) + Foundry jobs.
- ✅ **P1 cleanup**: removed shipped mock scope data; gitignored/untracked build
  artifacts; added a logger.
- ✅ **P2 (partial)**: security headers (verified live); removed dead
  `trust-pagerank.ts`.

**Deliberately not done in this environment (with reasons)**
- ⏸ **Smart-contract hardening (P2 #11)**: Foundry can't be installed here (no
  network to the installer; OZ not vendored), so changes to escrow/payment
  Solidity can't be compiled or tested. Pushing unverified money-handling code
  is the exact risk to avoid — left as the specified follow-up in §8.
- ⏸ **workspace/board consolidation (P2 #10)**: genuine product/UX decision (two
  distinct entry points); folding 700–900-line files blind risks breaking
  navigation. Needs a product call on which entry point to keep.
- ⏸ **Large-file refactors (P2 #10)**: deferred — high risk to verify without
  full click-through QA.
- ℹ️ **Production build**: not verifiable in this sandbox — `next/font/google`
  fetches DM Sans / JetBrains Mono at build time and the network is restricted
  here (succeeds on Vercel/GitHub Actions). Worth self-hosting fonts
  (`next/font/local`) so builds don't depend on external network.

Everything below is the original evaluation.

---

## 0. How this evaluation was performed (methodology)

This is not a read-only skim. I stood the system up and exercised it:

- Installed the monorepo (`pnpm install`), ran `pnpm typecheck` (passes, 7/7), `pnpm lint` (broken — see §6), and inspected every package.
- Spun up **PostgreSQL 16 locally**, applied all Drizzle migrations (`0000`–`0004`), and discovered an **orphaned migration** (`0001_add_skills.sql`) that is not in `meta/_journal.json` and therefore never runs via `drizzle-kit migrate` (§6.4).
- Booted the Next.js dev server with a local DB driver and drove real HTTP flows with `curl`: magic-link login → session cookie → profile → squad creation → scope/bid seeding.
- Ran **adversarial multi-tenant tests** with a second user ("Mallory") to confirm or refute each authorization claim, rather than trusting static analysis. This corrected several false positives from the initial automated pass (§3.1).
- Confirmed SSR renders for `/`, `/login`, `/scopes`, `/dashboard`, `/docs/mcp` (all HTTP 200).
- Exercised the AI Scope Analyst endpoint (degrades cleanly to an SSE `error` event when no API key is present).

**Headline verdict:** SquadSwarm is an impressively *complete-looking* Phase 0–2 implementation — the full PRD surface area exists (scopes, AI analyst, bidding, governance, contracts, collaboration workspace, MCP server, escrow + splitter contracts, EAS schemas, trust scoring). But it is **not production-ready**. It has **confirmed cross-tenant data leaks (IDOR)** in a sealed-bid marketplace, **zero automated tests** outside Solidity, a **non-functional linter**, **duplicated core logic** (the AI analyst exists twice), an **outdated/under-spec AI model**, and **committed build artifacts**. It is a strong *prototype/demo*; the gap to "production-ready, security-hardened, polished" is real and concentrated in a tractable set of areas.

---

## 1. PRD conformance matrix

Legend: ✅ built & works · 🟡 built but partial/stubbed/divergent · ❌ missing · ⛔ spec'd but intentionally not the chosen path

| PRD area | Status | Evidence / notes |
|---|---|---|
| **Auth — SIWE** (§20.1) | 🟡 | Implemented (`/api/auth/siwe`) but **no server-side nonce store** → replay risk; chain id hardcoded; address parsed by regex. |
| **Auth — magic link** (not in PRD; PRD says SIWE-only) | 🟡 | Works end-to-end, but **logs the raw token to stdout** (`auth/login/route.ts`). Email via Resend optional. |
| Sessions / JWT (§20.1) | 🟡 | httpOnly + sameSite=lax + secure-in-prod ✅. But **`JWT_SECRET` falls back to `'dev-secret-change-me'`** (`lib/auth.ts:4`). |
| **AI Scope Analyst** (§8) | 🟡 | Functional pipeline (sufficiency → work plan, SSE streamed). **But uses `claude-3-haiku-20240307`** (PRD specifies Opus-class), logic is **duplicated** between `packages/ai` and the route, and prompts are **injectable**. |
| Documentation sufficiency score (§7.1, C2) | ✅ | `scoreDocumentation()` + dimensions stored on proposal. |
| Scope Board + filtering (§7.2) | 🟡 | List works; `/scopes` page ships **hardcoded `MOCK_SCOPES`** as a fallback. Recommendation engine is heuristic, not embeddings (PRD §17.3). |
| Squad management / governance (§7.3) | 🟡 | Create/members/roles/permissions ✅. Governance models (consent/majority/delegated) modeled; multisig is an address field only (no Safe SDK). |
| Agent registry (§7.3) | ✅ | CRUD with owner-scoped authz (verified correct). |
| **Bidding + governance voting** (§7.4, §13.1) | 🟡 | Rich implementation (votes, assignments, claims, comments). **Bid detail readable by any user — IDOR (confirmed).** |
| Client bid review / compare (§7.5) | 🟡 | Per-scope bid list exists; side-by-side compare not clearly present. |
| **Contracts / escrow lifecycle** (§11) | 🟡 | Off-chain state machine ✅; on-chain calls are client-side viem; **`complete` only logs** "release pending" (`logPaymentRelease` is a `console.log`). |
| Collaboration interface — Kanban (§9.2.1) | 🟡 | `workspace` + a **second `board` page** (~710 lines) overlap — unclear which is canonical. |
| Timeline/Gantt (§9.2.2) | 🟡/❌ | Route exists, minimal. D3 Gantt from PRD not realized. |
| Activity feed (§9.2.3) | ✅ | `activity_log` written across flows. |
| Files space + versions (§9.2.4) | 🟡 | Upload via Supabase/Blob; version history schema present, diff/preview limited. |
| Discussion / channels (§9.2.5) | ✅ | Channel-typed messages, human + agent authors. |
| PM dashboard (§9.2.6) | 🟡 | `/contracts/[id]/pm` exists; risk indicators heuristic. |
| Client review w/ acceptance checklist (§9.2.7) | 🟡 | `/review` route exists. |
| **MCP server — 11 tools** (§10.3) | ✅ | All 11 tools present, agent-JWT auth, autonomy gating + action queue. Solid. No retries/timeouts on API client. |
| **Smart contracts** (§11.3) | 🟡 | `SquadSwarmEscrow`, `PaymentSplitter`, `MockUSDC` exist with Foundry tests. **No Pausable, no emergency path; splitter `owner` can `distribute()`.** `SquadRegistry.sol` from PRD **missing**. |
| **EAS attestations** (§12) | 🟡 | Schemas defined; **all schema UIDs are `0x000…0` placeholders** → not registered; attestations stored off-chain only. |
| Trust scoring (§12.3) | 🟡 | Implemented but **split across 3 files** with a simpler formula than PRD; a separate PageRank file also exists (unclear which is authoritative). |
| Disputes (§13.2) | 🟡 | DB + routes + on-chain `raiseDispute/resolveDispute/autoSplit`. Mediation pool not built (Phase 3). |
| Real-time (WebSocket/Redis) (§17.2) | ❌ | **No Socket.io / Redis.** "Real-time" is request/refresh. PRD's presence/live-updates not implemented. |
| Search (Meilisearch) (§17.2) | ❌ | SQL `ILIKE` search instead. Acceptable for scale, divergent from PRD. |
| Queue (BullMQ) (§17.2) | ❌ | No background job system; AI analysis runs inline in the request. |
| **Tests / CI** (§17.5) | ❌ | **0 app/package tests.** Only 2 Solidity test files. Lint non-functional. |
| Rate limiting (§20.4) | ❌ | **None anywhere** (`grep` for ratelimit/upstash → empty). |

**Phase read:** Phases 0–2 are ~70–85% surfaced in UI/endpoints but ~40–50% production-hardened. Phase 3 (real-time, mediation, multi-chain, analytics) largely absent. The codebase is **demo-complete, not production-complete**.

---

## 2. What actually works (verified live)

These flows I drove successfully against a real database:

1. **Magic-link auth** → `POST /api/auth/login` issues token, `POST /api/auth/verify` sets a valid `session` JWT cookie, `GET /api/users/me` returns the profile. ✅
2. **Unauthenticated guard** → `GET /api/users/me` without cookie → `401`. ✅
3. **Squad creation** → `POST /api/squads` creates squad + admin membership with permissions. ✅
4. **Squad member add is correctly gated** → non-admin `POST .../members` → `403 Forbidden`. ✅ (the initial automated audit wrongly flagged this as open).
5. **Health** endpoint, SSR pages (5/5) → `200`. ✅
6. **AI analyst** endpoint streams and fails gracefully without a key. ✅ (degradation path)
7. `typecheck` passes across all 7 workspaces. ✅

This is a meaningful baseline: the happy path is genuinely wired, not faked.

---

## 3. Security — the critical blockers

> A bidding marketplace's entire value proposition is that bids and scopes are confidential until revealed. The IDOR issues below are therefore **product-fatal**, not cosmetic. I confirmed each by replaying the request as a second, unrelated authenticated user.

### 3.1 Confirmed cross-tenant reads (IDOR) — P0

I created user **Raya** (client + squad admin) and user **Mallory** (unrelated). With Mallory's session cookie:

**(a) Competitor bid disclosure — CONFIRMED.**
`GET /api/bids/{bidId}` returned Raya's full bid to Mallory: `approach` narrative, `proposedPrice` ($4200), `paymentSchedule`, `treasuryShareBps`. HTTP **200**.

`apps/web/app/api/bids/[bidId]/route.ts` (GET):
```ts
export async function GET(_req, { params }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { bidId } = await params;
  const [bid] = await db.select().from(bids).where(eq(bids.id, bidId)).limit(1);
  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
  return NextResponse.json(bid);   // ← no membership / client check
}
```
**Fix** — gate on squad membership OR scope client:
```ts
const role = await getBidViewerRole(session.userId, bid); // member of bid.squadId, or client of bid.scopeId
if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
// Clients should see a *redacted* view until bidding closes (hide pricing of competitors).
return NextResponse.json(role === 'client' ? redactForClient(bid) : bid);
```

**(b) Squad member roster + emails — CONFIRMED.**
`GET /api/squads/{squadId}/members` returned member emails to a non-member. HTTP **200**.
`apps/web/app/api/squads/[squadId]/members/route.ts` GET has **no membership check** (the POST handler does — `403` verified). Add the same `adminMembership`/membership guard to GET, and **stop returning `userEmail`** to anyone but admins.

**(c) Payment distribution + wallet addresses — CONFIRMED by code path.**
`GET /api/contracts/{contractId}/distribution/route.ts` only checks `getSession()` then returns `members[].walletAddress` and per-member dollar amounts. Any authenticated user can read another squad's payout split + wallets. Gate with `getContractRole()` (which already exists in `lib/contract-access.ts`).

**(d) Scope detail leak for confidential scopes — CONFIRMED.**
`GET /api/scopes/{scopeId}` returns narrative/budget with no check. Marketplace scopes are public (fine), but `confidentiality: 'confidential'`/NDA scopes (PRD §20.2) leak to every logged-in user. Branch on confidentiality + (client | invited squad).

**Systemic root cause:** authorization is **hand-rolled per route** with no shared guard, so coverage is inconsistent — some routes check correctly, adjacent ones forget. See §5.1 for the structural fix.

### 3.2 What the automated pass got WRONG (corrected here)

To keep the strategy honest, these "critical" flags from the first automated sweep are **false positives** — I verified the actual handlers:

- `POST /api/bids/[bidId]/accept` — **does** check `scope.clientId !== session.userId` → 403. Safe.
- `POST /api/contracts/[contractId]/complete` — **does** check `contract.clientId !== session.userId` → 403. Safe.
- `PATCH /api/agents/[agentId]` — query is scoped `where(and(eq(id), eq(ownerId, session.userId)))` → can't touch others' agents. Safe.
- `POST /api/squads/[squadId]/members` — **does** require admin membership → 403 (verified live). Safe.

The lesson for the team: **static "does this file mention ownerId?" is not authorization testing.** Adopt the request-replay test pattern (§7) so these claims are settled by evidence.

### 3.3 Other security hardening (P0/P1)

| # | Issue | File | Severity | Fix |
|---|---|---|---|---|
| S1 | Default JWT secret fallback | `lib/auth.ts:4`, `lib/agent-auth.ts` | P0 | **Throw at boot** if `JWT_SECRET` unset/short; never fall back. |
| S2 | SIWE nonce not stored/consumed → replay | `api/auth/siwe/route.ts` | P0 | Persist nonce (table or Redis) with TTL, mark used on verify. |
| S3 | Magic-link token logged to stdout | `api/auth/login/route.ts:34` | P1 | Remove; gate behind `NODE_ENV!=='production'` at most. |
| S4 | No rate limiting on auth/AI/mutations | everywhere | P1 | Add `@upstash/ratelimit` (or in-memory dev shim) on `/api/auth/*`, analyze, message posts. |
| S5 | Prompt injection: user narrative/doc text interpolated raw into LLM prompt | `packages/ai/scope-analyst.ts`, `api/.../analyze/route.ts` | P1 | Wrap user content in delimiters + explicit "treat as data" instruction; cap length; validate output with the existing Zod `WorkPlanSchema`. |
| S6 | SIWE chain id hardcoded, address via regex | `api/auth/siwe/route.ts` | P2 | Use the `siwe` library's `SiweMessage.verify()` (validates domain, nonce, chainId, expiry). |
| S7 | No security headers / CSP | `next.config` | P2 | Add CSP, HSTS, `X-Content-Type-Options`, frame-ancestors. |

---

## 4. AI layer — correctness & maintainability

### 4.1 The Scope Analyst is implemented twice (delete one)

There are **two divergent implementations** of the platform's flagship feature:

- `packages/ai/src/scope-analyst.ts` — `analyzeScopeStreaming()` + `scoreDocumentation()`, with its own system prompt.
- `apps/web/app/api/scope-proposals/[proposalId]/analyze/route.ts` — a **separate** ~190-line inline implementation with its **own** `SYSTEM_PROMPT`, its own Anthropic client, and its own JSON-extraction logic. **It does not import the package.**

This is exactly the redundant/spaghetti code to remove. Consolidate into the package; the route should be a thin caller:
```ts
// route.ts (after refactor)
import { analyzeScopeStreaming } from '@squadswarm/ai';
// ...authz + load proposal/docs...
return analyzeScopeStreaming({ narrative, documents, budget, timeline, history });
```
Benefits: one prompt to maintain, one place to add Zod validation, one place to swap models, and the package becomes independently testable.

### 4.2 Model is outdated and under-spec

All three AI call sites use **`claude-3-haiku-20240307`** (`scope-analyst.ts:150,166`, `extract-skills.ts:21`, `analyze/route.ts:105`). The PRD §8.4/§17.3 calls for **Opus-class** reasoning for scope decomposition — the single most reasoning-heavy task in the product. Haiku-3 (early 2024) will produce shallow work plans.

**Recommendation:** centralize model IDs in one config and use current models per task:
```ts
// packages/ai/src/models.ts
export const MODELS = {
  scopeAnalyst: 'claude-opus-4-20250514',   // deep decomposition (PRD §8.4)
  skillExtract: 'claude-haiku-4-5-20251001',// cheap, high-volume
} as const;
```
Wire `aiUsageLogs` (the table already exists but is **never written**) to record `inputTokens/outputTokens/estimatedCost/model/purpose` after each call — the PRD wants cost tracking and you have the schema for free.

### 4.3 The "fake streaming" hack

`analyze/route.ts` does a **non-streaming** `messages.create()` then re-chunks the text into SSE `text_delta` events to simulate streaming (comment admits the reason: an `on('end')` race). Use the SDK's real streaming (`client.messages.stream()`), which removes the race and gives true first-token latency. This belongs in the consolidated package method.

---

## 5. Architecture & code quality

### 5.1 No shared authorization layer (the structural fix for §3)

Every route re-implements `getSession()` + ad-hoc ownership checks. Introduce composable guards so authz is declarative and impossible to forget:

```ts
// lib/guard.ts
export function withContractRole(
  roles: ContractRole[],
  handler: (ctx: { req: NextRequest; userId: string; role: ContractRole; params: any }) => Promise<Response>,
) {
  return async (req: NextRequest, { params }: { params: Promise<any> }) => {
    const p = await params;
    const session = await getSession();
    const agent = session ? null : await getAgentSession(req);
    const principal = session?.userId ?? agent?.ownerId;
    if (!principal) return json({ error: 'Unauthorized' }, 401);
    const role = await getContractRole(principal, p.contractId);
    if (!role || !roles.includes(role)) return json({ error: 'Forbidden' }, 403);
    return handler({ req, userId: principal, role, params: p });
  };
}
```
Then a route is one line of policy:
```ts
export const GET = withContractRole(['client', 'squad_admin', 'squad_member'], async ({ params }) => { ... });
export const POST = withContractRole(['client'], async ({ params }) => { /* complete */ });
```
Add `withBidAccess`, `withSquadRole`, `withScopeOwner` analogues. This single change closes the entire IDOR class **and** removes the most-repeated boilerplate in the app.

### 5.2 Oversized "god" components

Refactor by extraction (data hooks + presentational components); these are unmaintainable and untestable as-is:

| File | Lines |
|---|---|
| `contracts/[contractId]/page.tsx` | **1,839** |
| `bids/[bidId]/collaborate/page.tsx` | **1,400** |
| `contracts/[contractId]/workspace/page.tsx` | 878 |
| `contracts/[contractId]/board/page.tsx` | 710 |
| `bids/new/page.tsx` | 672 |

Pattern: pull server state into `useQuery` hooks in `lib/queries/`, split each page into `<Header>`, `<DeliverablesBoard>`, `<PaymentPanel>`, etc. Target <300 lines/component.

### 5.3 Duplicated views: `workspace` vs `board`

Two Kanban implementations exist for the same contract. Neither is linked from the sidebar (verified). **Decide one canonical workspace, delete the other.** Carrying both guarantees drift.

### 5.4 Trust scoring split three ways

`lib/trust-calculator.ts`, `lib/trust-pagerank.ts`, `lib/trust-threshold.ts` implement overlapping notions of "trust" with no single entry point. Pick one model (the PRD §12.3 weighted formula is the spec), make it the only public function, and either delete `trust-pagerank.ts` or document it as an explicitly-deferred experiment.

### 5.5 Mock data shipped in a real page

`scopes/page.tsx` defines `MOCK_SCOPES` (6 entries, `_isMock:true`) and falls back to them when the API fails. In production this means a backend outage silently shows **fake marketplace listings**. Replace with an empty-state + error state; remove the mock array.

---

## 6. Junk, artifacts & broken tooling (cleanup checklist)

1. **Committed build artifacts** in git: `apps/web/tsconfig.tsbuildinfo`, `packages/web3/tsconfig.tsbuildinfo`. Remove and add `*.tsbuildinfo` + `.next/` to `.gitignore`.
2. **Lint is non-functional.** `pnpm lint` → `web` runs deprecated `next lint` which **prompts interactively and fails CI**; every package just `echo 'no lint configured'`. Migrate to flat ESLint config with `@typescript-eslint` + `eslint-plugin-react-hooks`, wire `turbo lint`.
3. **75 `console.*` calls** in shipped `app/`+`lib/`+`packages` (excludes `.next`). Replace with a small logger that no-ops in prod or routes to Sentry. Several leak data (`[DEV] Magic link token…`, `[Crypto] … release pending`).
4. **120 `TODO/FIXME/mock/placeholder`** hits across source — triage into tracked issues; the `attestation-service.ts` `onChain:false // TODO` and the `logPaymentRelease` stub are the load-bearing ones.
5. **Orphaned migration:** `packages/db/migrations/0001_add_skills.sql` is **absent from `meta/_journal.json`**, so `drizzle-kit migrate` never applies it. On a clean Neon DB, the `skills`/`user_skills` tables won't exist → skills features 500. Either regenerate via `drizzle-kit generate` (so it's journaled) or fold into a journaled migration.
6. **`packages/ui` is an empty stub** (`export const TODO_UI = true`) while `apps/web/components` holds the real components. Either populate the shared package or remove it from the workspace to reduce noise.
7. **`scripts/test-collaborative-flow.ts`** references `claude-sonnet-4-20250514` — a stray third model id; fold into the central model config.

---

## 7. Testing & CI (currently zero)

There are **no** Vitest/Jest/Playwright tests. For a system moving money and gating confidential bids, this is the largest single risk. Minimum bar before "production":

- **Unit (Vitest):** `payment-distribution`, `trust-calculator`, `autonomy.shouldQueue`, AI JSON extraction, Zod schemas.
- **Integration (Vitest + ephemeral Postgres):** the IDOR matrix as regression tests — *exactly* the Raya/Mallory replays I ran by hand:
```ts
test('non-member cannot read a squad bid', async () => {
  const { cookie: mallory } = await loginAs('mallory@example.com');
  const res = await app.get(`/api/bids/${rayaBid.id}`, { cookie: mallory });
  expect(res.status).toBe(403);   // currently 200 — would fail today, which is the point
});
```
- **E2E (Playwright):** client scope→publish→bid→accept→complete happy path; **mobile viewport** runs (the PRD wants responsive across devices — currently unverified at any breakpoint).
- **Contracts:** Foundry tests exist but **Foundry isn't installed in CI** here; add a CI job that installs Foundry and runs `forge test` + `forge coverage`.

---

## 8. Smart contracts (audit-blockers)

From `contracts/src/`:
- **No `Pausable`** on `SquadSwarmEscrow` — once `Active`, a discovered bug locks funds with no circuit breaker. Add OZ `Pausable` gating `deposit/releaseMilestone/complete`.
- **`PaymentSplitter.distribute()` callable by `owner` directly**, not only the escrow — the deployer could trigger distribution outside the escrow lifecycle. Restrict to the escrow address (or remove owner path).
- **No emergency/timelock recovery** if the immutable `arbitrator` key is lost/compromised.
- **`SquadRegistry.sol` (PRD §11.3) is missing.**
- **EAS schema UIDs are all zero** — attestations can't be written on-chain until schemas are registered on Base; until then "portable reputation" (a core thesis) is off-chain only. Track as a deployment task with the resulting UIDs checked into config.
- **`MockUSDC` mint is open** — keep it strictly out of any mainnet deploy script (add a network guard in `Deploy.s.sol`).

---

## 9. First-principles re-examination — going deeper than the PRD

Stepping back from "is it built to spec" to "what is this product *for*": SquadSwarm's irreducible thesis is **human–agent teams as the atomic unit of work, coordinated through legible scopes and trust-minimized payment.** Three observations where first principles suggest going *beyond* the PRD:

**9.1 Confidentiality is the product, so build it in, not on.**
A sealed-bid cooperative marketplace lives or dies on "competitors can't see my bid; clients can't see my margin until reveal." Today authz is best-effort per route (§3). The first-principles move is a **single policy layer** (§5.1) plus a **bid-reveal state machine**: bids are encrypted/redacted until `biddingDeadline`, then revealed atomically. This turns a bolt-on access check into a guaranteed product property and is a genuine differentiator vs. Upwork.

**9.2 "Agents as first-class members" demands attribution you can't fake.**
The PRD's radical-attribution principle (§4.2 #4) is only as good as its provenance. The honest version: every agent action already flows through agent-JWT + `activity_log`. Lean into it — make **per-deliverable contribution provenance** (the PRD's "72% Agent / 28% Human") a first-class, signed record derived from file-version authorship, and surface it to clients at review time. That's the feature no freelance platform can copy because they don't model agents at all.

**9.3 The AI analyst is the wedge — invest there, not in crypto plumbing.**
The thing a new client first touches is the Scope Analyst. It currently runs on Haiku-3 with a duplicated, injectable prompt and no validation. First principles: the analyst's *quality* is the top-of-funnel conversion lever (PRD success metric: 40%+ work-plan acceptance without edits). Prioritize (a) Opus-class model, (b) Zod-validated structured output so the work plan is always schema-correct, (c) a tight clarifying-question loop. This matters more than EAS registration for early adoption.

**9.4 Decouple from crypto for the first run.**
The PRD itself raises this (§24.1 Q4). Today auth is dual (magic link + SIWE) and payments are "log a console message." Reality: the cooperative-work value prop stands **without** on-chain escrow for a closed beta. Ship the coordination + AI + attribution loop with off-chain "payment recorded" + Stripe-style escrow stub, and treat on-chain as an opt-in upgrade. This removes the single biggest adoption barrier (wallets) and lets the contracts get a real audit before they hold real money.

**9.5 Make "real-time" honest.**
The PRD promises presence and live updates (§9.3); the implementation is refresh-based. Rather than pull in Socket.io/Redis prematurely, adopt a lightweight **SSE activity stream per contract** (you already use SSE for the analyst) and optimistic cache updates via React Query. Honest, incremental, no new infra.

---

## 10. Prioritized execution plan

**P0 — Security & correctness (before any external user):**
1. Ship the shared authz guard (§5.1) and close IDOR on bids, squad members, contract distribution, confidential scopes (§3.1). Add the Raya/Mallory regression tests (§7).
2. Remove `JWT_SECRET` fallback; fail-fast at boot (§3.3 S1).
3. SIWE nonce store + consume, or swap to the `siwe` lib (§3.3 S2/S6).
4. Remove token logging (§3.3 S3).
5. Fix the orphaned skills migration (§6.5).

**P1 — Trust the platform can keep:**
6. Consolidate the AI analyst into `packages/ai`, upgrade to Opus-class, add Zod validation + real streaming + usage logging (§4).
7. Rate limiting on auth/AI/message endpoints (§3.3 S4) and prompt-injection hardening (§3.3 S5).
8. Stand up Vitest + Playwright + the IDOR integration suite; wire a real ESLint and `forge test` into CI (§6.2, §7).
9. Remove committed build artifacts + mock marketplace data; reduce `console.*` to a logger (§6).

**P2 — Polish & coherence:**
10. Pick one canonical contract workspace; delete the duplicate (§5.3). Unify trust scoring (§5.4). Break up the 1,000+ line pages (§5.2).
11. Smart-contract hardening (Pausable, splitter access, registry, EAS registration) ahead of an external audit (§8).
12. Responsive/mobile QA pass at real breakpoints (PRD cross-device goal).

**P3 — First-principles bets (§9):**
13. Bid-reveal state machine; signed contribution provenance; off-chain-first payment path; SSE activity stream.

---

## Appendix A — Confirmed-live evidence log

- `GET /api/users/me` (no cookie) → `401`; (with cookie) → profile JSON. ✅
- `POST /api/squads` → squad + admin membership. ✅
- Non-admin `POST /api/squads/{id}/members` → `403`. ✅ (audit false-positive corrected)
- Non-member `GET /api/squads/{id}/members` → `200` **leaking emails**. ❌ IDOR
- Non-member `GET /api/bids/{id}` → `200` **leaking approach + $4200 price + payment terms**. ❌ IDOR
- Non-member `GET /api/scopes/{id}` (confidential) → `200` leaking narrative/budget. ❌ IDOR
- `POST /api/scope-proposals/{id}/analyze` → SSE; without key emits clean `error` event; model = `claude-3-haiku-20240307`. 🟡
- SSR: `/`, `/login`, `/scopes`, `/dashboard`, `/docs/mcp` → `200`. ✅
- `pnpm typecheck` → 7/7 pass. ✅  ·  `pnpm lint` → broken (interactive prompt). ❌  ·  Foundry → not installed. ❌
- Migrations `0000`–`0004` apply; `0001_add_skills.sql` not journaled. ❌
