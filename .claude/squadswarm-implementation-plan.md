# SquadSwarm — Implementation Plan

**Author:** Benjamin Life (@omniharmonic)
**Date:** April 3, 2026
**Status:** Draft
**Companion to:** SquadSwarm PRD v1.0, Technical Architecture v1.0
**License:** CC BY-SA 4.0

---

## How to Read This Document

This implementation plan is designed for execution by an autonomous engineering swarm — human developers and AI agents working in parallel. Every task has:

- **Task ID** (e.g., `P0-M1-T03`) — Phase, Milestone, Task number. Use these for cross-referencing.
- **Depends on** — Task IDs that must be complete before this task can start. If empty, the task has no blockers.
- **Touches** — Files, packages, or directories this task creates or modifies.
- **Acceptance criteria** — Measurable conditions for "done." A task is not complete until all criteria are met.
- **Effort** — Estimated hours. These are rough guides, not commitments.
- **Agent-suitable** — Whether this task can be fully executed by an AI agent (✓), requires human judgment (✗), or is partially automatable (◐).

**Dependency notation:**
- `→ P0-M1-T03` means "this task depends on P0-M1-T03"
- `→ P0-M1-*` means "this task depends on all tasks in Milestone P0-M1"
- `⊘` means "no dependencies — can start immediately"

**Parallel execution:** Tasks within the same milestone that share no dependencies can be worked on simultaneously. The dependency graph is designed to maximize parallelism.

---

## Phase Overview

| Phase | Name | Duration | Goal |
|---|---|---|---|
| P0 | Foundation | Weeks 1–3 | Repository, database, auth, and core data model |
| P1 | Scope Pipeline | Weeks 3–6 | Scope submission → AI analysis → Scope Board |
| P2 | Squad & Bidding | Weeks 5–8 | Squad management, agent registry, bidding system |
| P3 | Contract & Collaboration | Weeks 7–12 | Contract formation, collaboration interface, PM tools |
| P4 | MCP Agent Integration | Weeks 10–14 | MCP server, agent participation, attribution |
| P5 | Payments & Completion | Weeks 12–16 | Fiat payments (Stripe), contract completion, handoff |
| P6 | Trust & Discovery | Weeks 14–18 | Reputation system, suggestion engine, search |
| P7 | Web3 Module | Weeks 16–22 | Smart contracts, EAS, wallet auth, IPFS |
| P8 | Polish & Launch | Weeks 20–24 | Testing, performance, documentation, launch prep |

**Critical path:** P0 → P1 → P2 → P3 → P5 → P8 (minimum viable product)
**Parallel tracks:** P4 (agents) can start during P3. P6 (trust) can start during P5. P7 (Web3) can start during P5.

---

## Phase 0: Foundation

**Goal:** Repository scaffolding, database schema, authentication, and the shared infrastructure that everything else builds on.

**Duration:** Weeks 1–3
**Milestone count:** 5

---

### Milestone P0-M1: Repository & Tooling Setup

**Goal:** Monorepo is initialized, all packages exist as stubs, CI is green, and a developer can run `pnpm dev` and see a blank Next.js app.

---

#### P0-M1-T01: Initialize Turborepo monorepo

- **Depends on:** ⊘
- **Touches:** `/`, `turbo.json`, `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.nvmrc`
- **Acceptance criteria:**
  - `pnpm install` succeeds with no errors
  - `turbo.json` defines `build`, `dev`, `lint`, `typecheck`, `test` pipelines
  - `pnpm-workspace.yaml` lists `apps/*` and `packages/*`
  - `.nvmrc` specifies Node 22
  - `.gitignore` covers `node_modules`, `.next`, `.env.local`, `.turbo`, `contracts/out`, `contracts/cache`
- **Effort:** 1h
- **Agent-suitable:** ✓

#### P0-M1-T02: Create Next.js application scaffold

- **Depends on:** → P0-M1-T01
- **Touches:** `apps/web/`
- **Acceptance criteria:**
  - Next.js 15 app with App Router in `apps/web/`
  - TypeScript strict mode enabled
  - `pnpm dev --filter web` starts dev server on localhost:3000
  - App Router structure created: `app/(marketing)/page.tsx`, `app/(auth)/layout.tsx`, `app/(app)/layout.tsx`, `app/api/health/route.ts`
  - Health endpoint returns `{ status: "ok", timestamp: ... }`
  - `next.config.ts` configured with `transpilePackages` for all workspace packages
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M1-T03: Configure Tailwind CSS with design tokens

- **Depends on:** → P0-M1-T02
- **Touches:** `apps/web/tailwind.config.ts`, `apps/web/styles/globals.css`, `packages/ui/`
- **Acceptance criteria:**
  - Tailwind 4.x installed and configured
  - CSS variables defined for the full color palette from the PRD design system:
    - `--color-bg-primary: #FAF8F5`
    - `--color-bg-secondary: #F0EDE8`
    - `--color-text-primary: #2C2825`
    - `--color-accent-squad: #C4553A` (terracotta)
    - `--color-accent-agent: #3A8C8C` (teal)
    - `--color-accent-client: #D4A03C` (amber)
    - `--color-success: #3C7A4A`
    - `--color-warning: #CC7A2E`
    - `--color-error: #A63D2F`
    - `--color-escrow: #5A7A8C`
  - Google Fonts loaded: Fraunces (variable), Source Serif 4, JetBrains Mono, DM Sans
  - Tailwind config extends theme with custom colors, fonts, and 8px spacing grid
  - A test page renders all colors and fonts correctly
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M1-T04: Create shared packages stubs

- **Depends on:** → P0-M1-T01
- **Touches:** `packages/db/`, `packages/ai/`, `packages/mcp-server/`, `packages/web3/`, `packages/shared/`, `packages/ui/`
- **Acceptance criteria:**
  - Each package has: `package.json` (with name `@squadswarm/<name>`), `tsconfig.json`, `src/index.ts`
  - Each package exports at least one placeholder (`export const TODO = true`)
  - `pnpm turbo build` compiles all packages without errors
  - `packages/shared/src/constants.ts` exports the enums from the PRD:
    - `ScopeStatus`, `BidStatus`, `ContractStatus`, `DeliverableStatus`, `DeliverableFormat`
    - `GovernanceModel`, `PaymentMode`, `DisputeStatus`, `ChannelType`
    - `RoleTaxonomy` (array of standard role strings)
    - `FormatTaxonomy` (array of deliverable format strings)
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M1-T05: Configure ESLint, Prettier, and TypeScript

- **Depends on:** → P0-M1-T02, → P0-M1-T04
- **Touches:** Root `eslint.config.js`, `.prettierrc`, `tsconfig.base.json`
- **Acceptance criteria:**
  - Shared `tsconfig.base.json` with strict mode, paths aliases, and composite project references
  - ESLint with `@typescript-eslint`, `next/core-web-vitals`, `prettier` integration
  - Prettier with consistent settings: single quotes, trailing commas, 2-space indent, 100 char line width
  - `pnpm turbo lint` runs on all packages and passes
  - `pnpm turbo typecheck` runs on all packages and passes
- **Effort:** 1.5h
- **Agent-suitable:** ✓

#### P0-M1-T06: Configure GitHub Actions CI

- **Depends on:** → P0-M1-T05
- **Touches:** `.github/workflows/ci.yml`
- **Acceptance criteria:**
  - CI runs on push and PR to `main`
  - Jobs: `lint-and-typecheck`, `test`, `build`
  - Uses pnpm and Node 22
  - Caches `node_modules` and `.turbo`
  - All jobs pass on a clean repository
- **Effort:** 1h
- **Agent-suitable:** ✓

#### P0-M1-T07: Configure Vercel project

- **Depends on:** → P0-M1-T02
- **Touches:** `vercel.json`, Vercel dashboard
- **Acceptance criteria:**
  - Vercel project linked to GitHub repository
  - Build command: `turbo build --filter=web`
  - Root directory: `apps/web`
  - Preview deployments enabled for PRs
  - `vercel.json` configures function timeouts for MCP (300s) and AI analysis (120s) endpoints
  - Production deployment succeeds and serves the health endpoint
- **Effort:** 1h
- **Agent-suitable:** ◐ (requires Vercel dashboard access)

---

### Milestone P0-M2: Database Schema & Migrations

**Goal:** Complete Drizzle schema matching the PRD data model, migrations applied to Neon, and database service layer bootstrapped.

---

#### P0-M2-T01: Configure Neon database and Drizzle ORM

- **Depends on:** → P0-M1-T04
- **Touches:** `packages/db/src/client.ts`, `packages/db/drizzle.config.ts`, `packages/db/package.json`
- **Acceptance criteria:**
  - Neon project created with a `main` branch and a `dev` branch
  - `@neondatabase/serverless` and `drizzle-orm` installed
  - `drizzle.config.ts` points to Neon via `DATABASE_URL`
  - `client.ts` exports a configured `db` instance using the Neon HTTP driver
  - Connection verified: a test query `SELECT 1` succeeds from a Next.js API route
- **Effort:** 1.5h
- **Agent-suitable:** ◐ (requires Neon project creation)

#### P0-M2-T02: Define core schema — users, squads, squad_members

- **Depends on:** → P0-M2-T01
- **Touches:** `packages/db/src/schema/users.ts`, `packages/db/src/schema/squads.ts`, `packages/db/src/schema/squad-members.ts`, `packages/db/src/schema/index.ts`
- **Acceptance criteria:**
  - `users` table matches the architecture doc: `id`, `email`, `walletAddress`, `displayName`, `bio`, `avatarUrl`, `web3Enabled`, `trustScore`, `createdAt`, `updatedAt`
  - `squads` table matches: `id`, `name`, `slug`, `bio`, `avatarUrl`, `missionStatement`, `governanceModel` (jsonb), `revenueSplitDefault` (jsonb), `multisigAddress`, `chainId`, `paymentMode`, `trustScore`, `createdAt`, `updatedAt`
  - `squad_members` table matches: `id`, `squadId` (FK), `userId` (FK), `role`, `permissions` (jsonb), `joinedAt`, unique constraint on (squadId, userId)
  - All tables have proper Drizzle relations defined
  - `schema/index.ts` re-exports all table definitions
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M2-T03: Define core schema — agents

- **Depends on:** → P0-M2-T02
- **Touches:** `packages/db/src/schema/agents.ts`
- **Acceptance criteria:**
  - `agents` table: `id`, `ownerId` (FK users), `name`, `description`, `provider`, `model`, `connectionType`, `mcpEndpoint`, `capabilities` (jsonb), `capabilityScores` (jsonb), `apiKeyHash`, `status`, `createdAt`
  - Relation defined to `users` (owner)
- **Effort:** 1h
- **Agent-suitable:** ✓

#### P0-M2-T04: Define scope schema — scope_proposals, scope_documents, scopes

- **Depends on:** → P0-M2-T02
- **Touches:** `packages/db/src/schema/scope-proposals.ts`, `packages/db/src/schema/scope-documents.ts`, `packages/db/src/schema/scopes.ts`
- **Acceptance criteria:**
  - `scope_proposals` table: all fields from architecture doc including `aiAnalysis` (jsonb), `documentationScore`, `status` enum
  - `scope_documents` table: `id`, `scopeProposalId` (FK), `fileName`, `fileType`, `fileUrl`, `fileSizeBytes`, `extractedText`, `uploadedAt`
  - `scopes` table: all fields including `workPlan` (jsonb), `biddingDeadline`, `status`
  - All relations defined
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M2-T05: Define contract schema — bids, contracts, workstreams, deliverables

- **Depends on:** → P0-M2-T04
- **Touches:** `packages/db/src/schema/bids.ts`, `packages/db/src/schema/contracts.ts`, `packages/db/src/schema/workstreams.ts`, `packages/db/src/schema/deliverables.ts`
- **Acceptance criteria:**
  - `bids` table: all fields from architecture doc including `roleAssignments` (jsonb), `proposedTimeline` (jsonb), `governanceStatus`, `governanceVotes` (jsonb)
  - `contracts` table: all fields including `finalizedWorkPlan` (jsonb), `paymentSchedule` (jsonb), `disputeSplit` (jsonb), `smartContractAddress`
  - `workstreams` table: `id`, `contractId` (FK), `title`, `description`, `orderIndex`, `dependencies` (uuid array), `status`, timestamps
  - `deliverables` table: all fields including `acceptanceCriteria` (jsonb), `assignedMemberId` (FK), `assignedAgentId` (FK), `status`
  - All relations and foreign keys defined
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P0-M2-T06: Define collaboration schema — files, messages, activity_log, agent_logs, disputes

- **Depends on:** → P0-M2-T05
- **Touches:** `packages/db/src/schema/files.ts`, `packages/db/src/schema/messages.ts`, `packages/db/src/schema/activity-log.ts`, `packages/db/src/schema/agent-logs.ts`, `packages/db/src/schema/disputes.ts`
- **Acceptance criteria:**
  - All five tables match the architecture doc schema exactly
  - `messages` supports threading via `parentMessageId` self-reference
  - `files` has version tracking and `uploadedByUserId` / `uploadedByAgentId` (both nullable)
  - `activity_log` has flexible `metadata` (jsonb) for action-specific details
  - All relations defined
- **Effort:** 2.5h
- **Agent-suitable:** ✓

#### P0-M2-T07: Define supplementary schema — ai_usage_logs, notifications

- **Depends on:** → P0-M2-T01
- **Touches:** `packages/db/src/schema/ai-usage-logs.ts`, `packages/db/src/schema/notifications.ts`
- **Acceptance criteria:**
  - `ai_usage_logs`: `id`, `model`, `inputTokens`, `outputTokens`, `estimatedCost`, `purpose`, `entityId`, `createdAt`
  - `notifications`: `id`, `userId`, `type`, `title`, `body`, `metadata` (jsonb), `read`, `readAt`, `createdAt`
  - Relations defined
- **Effort:** 1h
- **Agent-suitable:** ✓

#### P0-M2-T08: Generate and apply migrations

- **Depends on:** → P0-M2-T02 through P0-M2-T07
- **Touches:** `packages/db/migrations/`
- **Acceptance criteria:**
  - `pnpm --filter db generate` produces SQL migration files
  - `pnpm --filter db migrate` applies migrations to Neon dev branch
  - All tables created successfully, verified by `\dt` in psql
  - Indexes from the architecture doc created: `idx_scopes_status_deadline`, `idx_scopes_category_tags` (GIN), `idx_deliverables_contract_status`, `idx_activity_log_contract_created`, `idx_messages_contract_channel`
- **Effort:** 1h
- **Agent-suitable:** ✓

#### P0-M2-T09: Create Zod validation schemas for all JSONB columns

- **Depends on:** → P0-M1-T04
- **Touches:** `packages/shared/src/schemas/`
- **Acceptance criteria:**
  - Zod schemas created for every JSONB structure:
    - `GovernanceConfigSchema` — decision model, action permissions, voting thresholds
    - `RevenueSplitSchema` — split type (equal, role-weighted, custom), per-member allocations
    - `WorkPlanSchema` — workstreams array with deliverables, dependencies, roles
    - `RoleAssignmentsSchema` — maps role IDs to member/agent IDs with rationale
    - `PaymentScheduleSchema` — upfront %, milestones, final %
    - `DisputeSplitSchema` — client/squad/platform percentages summing to 100
    - `AcceptanceCriteriaSchema` — array of criterion objects with description and measurable condition
    - `SufficiencyAssessmentSchema` — dimensions with scores and questions
  - All schemas exported from `packages/shared/src/schemas/index.ts`
  - Each schema has at least 3 test cases (valid input, edge case, invalid input)
- **Effort:** 4h
- **Agent-suitable:** ✓

---

### Milestone P0-M3: Authentication System

**Goal:** Users can sign up and log in via email magic link. Session management works across the app.

---

#### P0-M3-T01: Implement email magic link auth flow

- **Depends on:** → P0-M2-T02, → P0-M1-T02
- **Touches:** `apps/web/app/api/auth/login/route.ts`, `apps/web/app/api/auth/verify/route.ts`, `apps/web/app/api/auth/session/route.ts`, `apps/web/lib/auth.ts`
- **Acceptance criteria:**
  - `POST /api/auth/login` accepts `{ email }`, generates a magic link token, stores it in Neon with 15-minute expiry, sends email via Resend
  - `POST /api/auth/verify` accepts `{ token }`, validates against stored tokens, creates or finds user, issues JWT session cookie
  - `GET /api/auth/session` returns current user or 401
  - `DELETE /api/auth/session` clears session cookie
  - `lib/auth.ts` exports `getSession()` for use in API routes and server components (as specified in architecture doc)
  - JWT contains `userId`, `email`, expires in 7 days
  - httpOnly, secure, sameSite=lax cookie
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P0-M3-T02: Create auth middleware

- **Depends on:** → P0-M3-T01
- **Touches:** `apps/web/middleware.ts`
- **Acceptance criteria:**
  - Edge middleware runs on all `/app/` routes and all `/api/` routes except `/api/auth/*`, `/api/health`, and `/api/webhooks/*`
  - Checks for valid session cookie; redirects to `/login` for page routes, returns 401 for API routes
  - Integrates rate limiting via Upstash Redis (100 req/min for API, 300 req/min for MCP)
  - Passes through for unauthenticated marketing pages
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P0-M3-T03: Build login and signup UI

- **Depends on:** → P0-M3-T01, → P0-M1-T03
- **Touches:** `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/signup/page.tsx`, `apps/web/app/(auth)/verify/page.tsx`
- **Acceptance criteria:**
  - Login page: email input, "Send Magic Link" button, loading state, success message
  - Verify page: handles token from URL, shows loading → success → redirect to dashboard, or error state
  - Signup page: email + display name, sends magic link, creates account on verification
  - All pages use the SquadSwarm design system (warm off-white bg, Fraunces headings, DM Sans body)
  - Mobile responsive
  - Accessible: proper labels, focus management, screen reader support
- **Effort:** 4h
- **Agent-suitable:** ◐ (design judgment needed)

#### P0-M3-T04: Configure Resend for transactional email

- **Depends on:** → P0-M3-T01
- **Touches:** `apps/web/lib/email.ts`, email templates
- **Acceptance criteria:**
  - Resend SDK configured with API key
  - Magic link email template: clean, branded, single CTA button
  - `sendMagicLink(email, token)` function exported
  - Email sends successfully and link works in development (localhost with ngrok or similar)
- **Effort:** 2h
- **Agent-suitable:** ◐ (requires Resend account setup)

---

### Milestone P0-M4: Application Shell

**Goal:** Authenticated users land on a dashboard. Navigation works. The app feels real even though most pages are stubs.

---

#### P0-M4-T01: Build authenticated app layout with sidebar navigation

- **Depends on:** → P0-M3-T02, → P0-M1-T03
- **Touches:** `apps/web/app/(app)/layout.tsx`, `apps/web/components/sidebar.tsx`, `apps/web/components/user-menu.tsx`
- **Acceptance criteria:**
  - Layout has: collapsible sidebar (left), main content area, top bar with user avatar/name
  - Sidebar navigation items: Dashboard, Scope Board, My Squads, My Contracts, Settings
  - Active route highlighted in sidebar
  - User menu dropdown: Profile, Settings, Log Out
  - Responsive: sidebar collapses to hamburger on mobile
  - Smooth transitions on sidebar collapse/expand
  - Uses design system colors, typography, spacing
- **Effort:** 5h
- **Agent-suitable:** ◐ (design judgment)

#### P0-M4-T02: Build dashboard page (stub with real data)

- **Depends on:** → P0-M4-T01
- **Touches:** `apps/web/app/(app)/dashboard/page.tsx`
- **Acceptance criteria:**
  - Server component that fetches current user's squads, active contracts, and recent activity from Neon
  - Displays: greeting with user name, "Your Squads" section (list or empty state), "Active Contracts" section (list or empty state), "Recent Activity" feed (or empty state)
  - Empty states have CTAs: "Create your first squad," "Browse the Scope Board"
  - Renders correctly with zero data (new user experience)
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P0-M4-T03: Create stub pages for all routes

- **Depends on:** → P0-M4-T01
- **Touches:** All `page.tsx` files under `apps/web/app/(app)/`
- **Acceptance criteria:**
  - Every route in the routing table from Section 4.2 of the architecture doc has a page file
  - Each stub page displays: page title, breadcrumb, and "Coming soon" placeholder with the route path
  - Navigation between all pages works without errors
  - No 404s for any defined route
- **Effort:** 2h
- **Agent-suitable:** ✓

---

### Milestone P0-M5: Supabase & External Services Setup

**Goal:** Supabase Realtime, Upstash Redis, Trigger.dev, and Meilisearch are configured and connected.

---

#### P0-M5-T01: Configure Supabase project

- **Depends on:** → P0-M2-T01
- **Touches:** `apps/web/lib/supabase.ts`, `.env.local`
- **Acceptance criteria:**
  - Supabase project created
  - Supabase client configured with anon key for client-side use
  - Supabase service role client configured for server-side use
  - Realtime enabled for: `deliverables`, `messages`, `activity_log`, `files` tables
  - Storage bucket created: `scope-documents`, `deliverable-files`, `avatars`
  - Test: subscribing to a Postgres change on `deliverables` table fires a real-time event
- **Effort:** 2h
- **Agent-suitable:** ◐ (requires Supabase dashboard)

#### P0-M5-T02: Configure Upstash Redis

- **Depends on:** → P0-M1-T01
- **Touches:** `apps/web/lib/redis.ts`, `.env.local`
- **Acceptance criteria:**
  - Upstash Redis database created
  - `@upstash/redis` and `@upstash/ratelimit` installed
  - `redis.ts` exports configured Redis client and rate limiter instances
  - Rate limiter tested: 100 req/min sliding window
- **Effort:** 1h
- **Agent-suitable:** ◐ (requires Upstash account)

#### P0-M5-T03: Configure Trigger.dev

- **Depends on:** → P0-M1-T02
- **Touches:** `trigger/`, `apps/web/lib/trigger.ts`, `trigger.config.ts`
- **Acceptance criteria:**
  - Trigger.dev project created and linked
  - `trigger.config.ts` at project root
  - A test task defined in `trigger/test-task.ts` that logs "hello world"
  - Task dispatched from a Next.js API route and executes successfully
  - `apps/web/lib/trigger.ts` exports a configured `tasks` client for dispatching
- **Effort:** 2h
- **Agent-suitable:** ◐ (requires Trigger.dev account)

#### P0-M5-T04: Configure Meilisearch

- **Depends on:** → P0-M1-T01
- **Touches:** `apps/web/lib/search.ts`, `.env.local`
- **Acceptance criteria:**
  - Meilisearch Cloud instance created (or Docker for local dev)
  - `meilisearch` JS client installed and configured
  - `scopes` index created with settings from architecture doc Section 17
  - Test: index a document, search for it, get results
  - Search key (read-only) exposed as `NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY`
- **Effort:** 1.5h
- **Agent-suitable:** ◐ (requires Meilisearch account)

---

## Phase 1: Scope Pipeline

**Goal:** A client can submit a scope proposal, have it analyzed by the AI Scope Analyst, review a generated work plan, and publish it to the Scope Board.

**Duration:** Weeks 3–6
**Depends on:** P0-M2-*, P0-M3-*, P0-M4-*, P0-M5-*

---

### Milestone P1-M1: Scope Proposal Submission

---

#### P1-M1-T01: Build scope proposal API — create, read, update

- **Depends on:** → P0-M2-T04, → P0-M3-T01
- **Touches:** `apps/web/app/api/scope-proposals/route.ts`, `apps/web/app/api/scope-proposals/[proposalId]/route.ts`, `packages/db/src/services/scope-proposals.ts`
- **Acceptance criteria:**
  - `POST /api/scope-proposals` creates a new proposal with `status: 'draft'`
  - `GET /api/scope-proposals/:id` returns proposal with documents
  - `PATCH /api/scope-proposals/:id` updates narrative, category tags, budget, timeline, feedback rounds, trust threshold, confidentiality
  - Only the proposal owner can read/update
  - Input validated against Zod schemas
  - Service functions in `packages/db/src/services/scope-proposals.ts` handle all database operations
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P1-M1-T02: Build document upload API

- **Depends on:** → P1-M1-T01, → P0-M5-T01
- **Touches:** `apps/web/app/api/scope-proposals/[proposalId]/documents/route.ts`
- **Acceptance criteria:**
  - `POST /api/scope-proposals/:id/documents` accepts multipart file upload
  - Files stored in Supabase Storage `scope-documents` bucket
  - Supported types: PDF, DOCX, XLSX, CSV, TXT, MD, PNG, JPG
  - Max file size: 25MB per file
  - File record created in `scope_documents` table with URL
  - For text-extractable files (PDF, DOCX, TXT, MD, CSV): extract text and store in `extractedText` column (use `pdf-parse` for PDF, `mammoth` for DOCX)
  - Returns file record with ID and URL
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P1-M1-T03: Build scope submission UI

- **Depends on:** → P1-M1-T01, → P1-M1-T02, → P0-M4-T01
- **Touches:** `apps/web/app/(app)/scopes/new/page.tsx`, multiple components
- **Acceptance criteria:**
  - Page layout: two-column on desktop (form left, preview right), stacked on mobile
  - Rich text editor (Tiptap) for scope narrative
  - File upload zone with drag-and-drop (shows uploaded files as cards with name, type icon, size, remove button)
  - Structured fields: project title, category tags (multi-select from controlled vocabulary + custom), budget range (min/max or "open"), timeline (days), feedback rounds (slider 0–10, default 3), trust threshold (dropdown: Open/Verified/Trusted/Elite/Custom), confidentiality (radio: Public/NDA/Invite-only)
  - Real-time documentation sufficiency score indicator (updated as user adds content — calls a lightweight scoring endpoint)
  - "Save Draft" button (saves to API, no analysis)
  - "Submit for Analysis" button (saves and triggers AI analysis, navigates to analysis page)
  - Form state persists across navigation (Zustand or URL state)
- **Effort:** 8h
- **Agent-suitable:** ◐ (significant UI/UX design work)

#### P1-M1-T04: Build documentation sufficiency scoring endpoint

- **Depends on:** → P1-M1-T01, → P0-M5-T03
- **Touches:** `apps/web/app/api/scope-proposals/[proposalId]/score/route.ts`, `packages/ai/src/scope-analyst.ts`
- **Acceptance criteria:**
  - `GET /api/scope-proposals/:id/score` returns a score object with dimensions from the PRD sufficiency rubric: outcome clarity, deliverable specificity, audience & context, technical constraints, quality standards, budget & timeline, dependencies & assumptions
  - Each dimension scored 0–100
  - Overall score is weighted average
  - Uses Claude API (Sonnet) with a lightweight prompt — not the full analysis, just scoring
  - Response time < 5 seconds
  - Score updates saved to `documentation_score` column
- **Effort:** 3h
- **Agent-suitable:** ✓

---

### Milestone P1-M2: AI Scope Analysis

---

#### P1-M2-T01: Implement the Scope Analyst system prompt and ontology

- **Depends on:** → P0-M2-T09
- **Touches:** `packages/ai/src/prompts/scope-analyst.ts`
- **Acceptance criteria:**
  - System prompt file contains the complete Scope Analyst prompt from the architecture doc Section 8
  - Includes: full ontology (Scope → Workstream → Deliverable hierarchy), role taxonomy, deliverable format taxonomy, sufficiency rubric
  - Prompt instructs the model to return valid JSON matching `WorkPlanSchema` or `SufficiencyAssessmentSchema`
  - Prompt is modular: taxonomy strings imported from `packages/shared/constants.ts`
  - Prompt tested against 3 sample scope proposals (simple, medium, complex) — produces valid JSON output for each
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P1-M2-T02: Implement scope analysis API endpoint (streaming)

- **Depends on:** → P1-M2-T01, → P1-M1-T01
- **Touches:** `apps/web/app/api/scope-proposals/[proposalId]/analyze/route.ts`, `packages/ai/src/scope-analyst.ts`
- **Acceptance criteria:**
  - `POST /api/scope-proposals/:id/analyze` triggers AI analysis
  - Fetches proposal + all documents + extracted text
  - Calls Claude API with streaming enabled
  - Returns SSE stream of the analysis conversation
  - Supports multi-turn: client can send follow-up messages (the API maintains conversation history in the request body)
  - On completion, stores the analysis result in `scope_proposals.ai_analysis`
  - Updates proposal status: `analyzing` → `needs_info` (if questions) or `ready` (if work plan generated)
  - Logs token usage to `ai_usage_logs`
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P1-M2-T03: Build AI analysis conversation UI

- **Depends on:** → P1-M2-T02
- **Touches:** `apps/web/app/(app)/scopes/[scopeId]/analyze/page.tsx`, chat components
- **Acceptance criteria:**
  - Chat-style interface: messages from the client (right) and analyst (left)
  - Streaming text display for analyst responses (typewriter effect)
  - If analyst returns questions: render them as a checklist; client can answer inline
  - If analyst returns a work plan: render the Work Plan Viewer (see P1-M2-T04)
  - Client can send follow-up messages to refine the analysis
  - "I'm satisfied — publish this scope" button appears when a work plan has been generated
  - Conversation history persists (stored in proposal's `ai_analysis` or separate conversation table)
- **Effort:** 6h
- **Agent-suitable:** ◐ (streaming UI + design)

#### P1-M2-T04: Build Work Plan Viewer component

- **Depends on:** → P0-M2-T09
- **Touches:** `packages/ui/src/components/work-plan-viewer.tsx`
- **Acceptance criteria:**
  - Renders a Work Plan JSON as a visual hierarchy:
    - Scope title and summary at top
    - Workstreams as expandable sections with dependency indicators
    - Deliverables within each workstream showing: title, format icon, acceptance criteria (collapsible list), estimated effort, required skills (tags), suggested role
  - Dependency visualization: arrows or lines showing workstream dependencies
  - Editable mode: client can modify deliverable titles, acceptance criteria, add/remove deliverables, reorder workstreams (changes tracked as a diff against the original AI output)
  - Read-only mode: for viewing in bid review and contract context
  - Responsive: collapses to vertical stack on mobile
- **Effort:** 6h
- **Agent-suitable:** ◐ (complex interactive component)

---

### Milestone P1-M3: Scope Board

---

#### P1-M3-T01: Implement scope publishing flow

- **Depends on:** → P1-M2-T02, → P0-M5-T04
- **Touches:** `apps/web/app/api/scope-proposals/[proposalId]/publish/route.ts`, `packages/db/src/services/scopes.ts`
- **Acceptance criteria:**
  - `POST /api/scope-proposals/:id/publish` with body `{ biddingDeadline }`:
    - Validates proposal has status `ready` and a work plan in `ai_analysis`
    - Creates a new `scopes` record with data from proposal + finalized work plan
    - Sets scope status to `open`
    - Updates proposal status to `published`
    - Indexes the scope in Meilisearch (title, narrative, category tags, required skills extracted from work plan)
  - Returns the created scope with its ID
  - Triggers notification job for squads with matching skills (P6 feature, stub for now)
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P1-M3-T02: Build Scope Board UI

- **Depends on:** → P1-M3-T01
- **Touches:** `apps/web/app/(app)/scopes/page.tsx`, `apps/web/components/scope-card.tsx`
- **Acceptance criteria:**
  - Card grid layout (3 columns desktop, 2 tablet, 1 mobile)
  - Each scope card shows: title, category tags (colored chips), budget range, timeline, required skills (first 5 + "+N more"), trust threshold badge, active bid count, time remaining in bidding window
  - Filter panel (sidebar on desktop, bottom sheet on mobile):
    - Category filter (multi-select)
    - Budget range (dual slider)
    - Timeline range (dual slider)
    - Trust threshold (dropdown)
    - Skills filter (search + multi-select)
  - Search bar using Meilisearch instant search (client-side, using the search-only key)
  - Sort options: newest, deadline soonest, budget highest, budget lowest
  - Pagination or infinite scroll (prefer infinite scroll with intersection observer)
  - Empty state: "No scopes match your filters"
  - Clicking a card navigates to scope detail page
- **Effort:** 7h
- **Agent-suitable:** ◐ (heavy UI work)

#### P1-M3-T03: Build Scope Detail page

- **Depends on:** → P1-M3-T02, → P1-M2-T04
- **Touches:** `apps/web/app/(app)/scopes/[scopeId]/page.tsx`
- **Acceptance criteria:**
  - Full scope narrative (rendered from markdown)
  - Work Plan Viewer component (read-only mode)
  - Client info: name, reputation score, past scopes posted
  - Attached documents (downloadable, with preview for PDFs and images)
  - Bidding info: number of bids, time remaining, trust threshold
  - For squad members: "Start Bid" CTA button
  - For the scope owner (client): shows list of submitted bids (links to bid review)
  - For non-authenticated users: "Sign up to bid" CTA
- **Effort:** 4h
- **Agent-suitable:** ✓

---

## Phase 2: Squad & Bidding

**Goal:** Users can create squads, register agents, and submit bids on scopes.

**Duration:** Weeks 5–8
**Depends on:** P0-M3-*, P0-M4-*, P1-M3-*

---

### Milestone P2-M1: Squad Management

---

#### P2-M1-T01: Build squad CRUD API

- **Depends on:** → P0-M2-T02
- **Touches:** `apps/web/app/api/squads/route.ts`, `apps/web/app/api/squads/[squadId]/route.ts`, `packages/db/src/services/squads.ts`
- **Acceptance criteria:**
  - `POST /api/squads` creates squad with name, slug (auto-generated from name), bio, governance model, creating user added as member with role `admin`
  - `GET /api/squads/:id` returns squad profile with members, agent count, trust score
  - `PATCH /api/squads/:id` updates squad settings (admin only)
  - `GET /api/squads` returns all squads the current user is a member of
  - Slug uniqueness enforced at database level
  - Governance model validated against `GovernanceConfigSchema`
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P2-M1-T02: Build squad membership API

- **Depends on:** → P2-M1-T01
- **Touches:** `apps/web/app/api/squads/[squadId]/members/route.ts`, `packages/db/src/services/squad-members.ts`
- **Acceptance criteria:**
  - `POST /api/squads/:id/members` — invite by email (sends invite email via Resend) or by user ID (direct add if inviter is admin)
  - `DELETE /api/squads/:id/members/:userId` — remove member (admin only, cannot remove last admin)
  - `PATCH /api/squads/:id/members/:userId` — update role and permissions
  - Invite flow: creates a pending invitation record; invited user sees invitation on their dashboard; accept/decline actions
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P2-M1-T03: Build agent registration API

- **Depends on:** → P0-M2-T03, → P2-M1-T01
- **Touches:** `apps/web/app/api/agents/route.ts`, `apps/web/app/api/agents/[agentId]/route.ts`, `apps/web/app/api/squads/[squadId]/agents/route.ts`, `packages/db/src/services/agents.ts`
- **Acceptance criteria:**
  - `POST /api/agents` registers an agent: name, description, provider, model, connection type, MCP endpoint, capabilities
  - Generates an API key (displayed once to the user), stores bcrypt hash
  - `GET /api/squads/:id/agents` returns all agents registered by members of the squad
  - `PATCH /api/agents/:id` updates agent configuration (owner only)
  - `DELETE /api/agents/:id` deregisters agent (owner only)
  - API key generation uses crypto.randomBytes(32).toString('hex')
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P2-M1-T04: Build Squad Management UI

- **Depends on:** → P2-M1-T01, → P2-M1-T02, → P2-M1-T03
- **Touches:** `apps/web/app/(app)/squads/new/page.tsx`, `apps/web/app/(app)/squads/[squadId]/page.tsx`, `apps/web/app/(app)/squads/[squadId]/agents/page.tsx`, `apps/web/app/(app)/squads/[squadId]/governance/page.tsx`
- **Acceptance criteria:**
  - **Create Squad page:** name, bio, mission statement, governance model selector (consent/majority/delegated — each with an explanation), revenue split default, "Create" button
  - **Squad Profile page:** header (avatar, name, mission), member list (with roles and invitation status), agent list (grouped by member), trust score display, portfolio (completed contracts — empty state for now), settings gear for admins
  - **Agent Registry page:** list of registered agents with provider/model badges, capability tags, connection status indicator, "Register Agent" form (modal or inline), API key display (shown once after creation with copy button and warning)
  - **Governance Settings page:** current model display, edit form (admin only), action permissions matrix (which actions require which governance process)
  - All pages mobile responsive
- **Effort:** 10h
- **Agent-suitable:** ◐ (significant UI)

---

### Milestone P2-M2: Bidding System

---

#### P2-M2-T01: Build bid CRUD API

- **Depends on:** → P0-M2-T05, → P2-M1-T01
- **Touches:** `apps/web/app/api/scopes/[scopeId]/bids/route.ts`, `apps/web/app/api/bids/[bidId]/route.ts`, `packages/db/src/services/bids.ts`
- **Acceptance criteria:**
  - `POST /api/scopes/:scopeId/bids` creates a bid in `draft` status. Validates that the creating user is a member of the specified squad and the squad meets the scope's trust threshold
  - `GET /api/scopes/:scopeId/bids` returns all bids (client only) or the current squad's bid (squad member)
  - `GET /api/bids/:id` returns bid detail (bid creator, scope client, or squad member)
  - `PATCH /api/bids/:id` updates bid fields (only while status is `draft` or `under_review`)
  - Service functions validate role assignments: every work plan role must be assigned, at least one human in a supervisory role for any agent assignment
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P2-M2-T02: Build bid governance flow

- **Depends on:** → P2-M2-T01
- **Touches:** `apps/web/app/api/bids/[bidId]/submit/route.ts`, `apps/web/app/api/squads/[squadId]/governance/vote/route.ts`
- **Acceptance criteria:**
  - `POST /api/bids/:id/submit` initiates the governance flow:
    - Checks squad's governance model for bid submission
    - If `delegated` and user has `submit_bid` permission: immediately sets status to `submitted`
    - If `consent` or `majority`: sets status to `under_review`, creates vote records for each member, sends notifications
  - `POST /api/squads/:id/governance/vote` casts a vote: `{ bidId, vote: 'approve' | 'reject', reason? }`
  - Vote tallying: when all votes are in (consent) or threshold is met (majority), bid status auto-advances to `submitted` or `rejected`
  - Timeout: if votes aren't complete within 48h (configurable), the bid expires
  - Voting updates trigger Supabase Realtime notifications
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P2-M2-T03: Build bid acceptance flow

- **Depends on:** → P2-M2-T01
- **Touches:** `apps/web/app/api/bids/[bidId]/accept/route.ts`, `packages/db/src/services/contracts.ts`
- **Acceptance criteria:**
  - `POST /api/bids/:id/accept` (client only):
    - Sets bid status to `accepted`
    - Sets all other bids for this scope to `rejected`
    - Sets scope status to `contracted`
    - Creates a `contracts` record with: finalized work plan (from bid's proposed modifications or original), role assignments, payment terms from bid, feedback rounds, dispute split (default or custom), status `pending_deposit`
    - Creates `workstreams` records from the work plan
    - Creates `deliverables` records from each workstream
    - Sends notifications to the winning squad and all rejected squads
  - Returns the created contract ID
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P2-M2-T04: Build Bid Builder UI

- **Depends on:** → P2-M2-T01, → P1-M2-T04
- **Touches:** `apps/web/app/(app)/bids/[bidId]/page.tsx`, bid builder components
- **Acceptance criteria:**
  - **Scope reference panel:** work plan viewer (read-only) visible alongside bid form
  - **Approach narrative:** Tiptap rich text editor
  - **Role Assignment Matrix:** table with roles from work plan as rows; dropdown selectors for each role showing squad members and registered agents; rationale text field per assignment; validation indicators (unassigned roles highlighted red)
  - **Work Plan Modifications:** toggle to "Propose Changes"; enables inline editing of the work plan viewer; changes shown as visual diff (green additions, red deletions, yellow modifications)
  - **Timeline editor:** simple date pickers per workstream (Gantt visualization is P3)
  - **Pricing section:** total bid amount input (USDC equivalent), breakdown by workstream (optional), payment schedule: upfront % (slider 0–50%, default 25%), milestone payments toggle, escrow terms display
  - **Squad Track Record section:** auto-populated from completed contracts; admin can highlight/reorder
  - **Internal governance status bar:** shows which members have reviewed, pending approvals, "Submit Bid" button (triggers governance flow)
  - Autosave to API every 30 seconds
- **Effort:** 10h
- **Agent-suitable:** ◐ (complex interactive UI)

#### P2-M2-T05: Build Client Bid Review UI

- **Depends on:** → P2-M2-T01
- **Touches:** `apps/web/app/(app)/scopes/[scopeId]/bids/page.tsx`
- **Acceptance criteria:**
  - Side-by-side comparison view (up to 3 bids; toggle to add/remove bids from comparison)
  - For each bid: squad profile summary (name, avatar, trust score), approach narrative preview (expandable), role assignments with member/agent profiles linked, timeline visualization (simple bar chart), pricing breakdown, work plan modifications (if any, shown as diff)
  - Comparison metrics at top: price, timeline, trust score, skill match percentage
  - Actions per bid: "Accept Bid" (with confirmation modal), "Reject" (with optional feedback), "Ask a Question" (opens a thread visible only to client + that squad)
  - "Accept Bid" triggers P2-M2-T03 flow
- **Effort:** 7h
- **Agent-suitable:** ◐ (design-heavy)

---

## Phase 3: Contract & Collaboration

**Goal:** Accepted bids become contracts with a full collaboration interface.

**Duration:** Weeks 7–12
**Depends on:** P2-M2-T03

---

### Milestone P3-M1: Collaboration Interface — Core

---

#### P3-M1-T01: Build Kanban board view

- **Depends on:** → P2-M2-T03, → P0-M5-T01
- **Touches:** `apps/web/app/(app)/contracts/[contractId]/board/page.tsx`, kanban components
- **Acceptance criteria:**
  - 5 columns: Not Started, In Progress, In Review, Revision Requested, Approved
  - Cards for deliverables: title, format icon, assignee avatar (circle for human, hexagon for agent), due date, comment count
  - Drag-and-drop between columns (dnd-kit) with permission enforcement (only PM can drag to Approved; agents cannot drag)
  - Filter bar: by workstream, assignee, due date range
  - Swimlane toggle: group by workstream
  - Real-time updates via Supabase Realtime (when any participant changes a card status, all viewers see the update)
  - Click card to open deliverable detail panel (slide-over or modal)
- **Effort:** 8h
- **Agent-suitable:** ◐

#### P3-M1-T02: Build deliverable detail panel

- **Depends on:** → P3-M1-T01
- **Touches:** `apps/web/components/deliverable-detail.tsx`
- **Acceptance criteria:**
  - Slide-over panel showing: title, description, format, acceptance criteria checklist, assigned member/agent, due date, status badge
  - File section: list of uploaded files with version history, preview for text/PDF/images, download button
  - Activity section: comments and status changes for this deliverable
  - Action buttons (role-dependent):
    - Assignee: "Upload File", "Mark In Review", "Flag Blocker"
    - PM: "Approve", "Request Revision" (with comment), "Reassign"
    - Client (when deliverable submitted to client): "Approve", "Request Revision" (counts against feedback rounds)
  - Human/agent attribution badge on each file and comment
- **Effort:** 6h
- **Agent-suitable:** ◐

#### P3-M1-T03: Build deliverable status API

- **Depends on:** → P0-M2-T05
- **Touches:** `apps/web/app/api/deliverables/[deliverableId]/status/route.ts`, `apps/web/app/api/deliverables/[deliverableId]/submit/route.ts`, `apps/web/app/api/deliverables/[deliverableId]/approve/route.ts`, `apps/web/app/api/deliverables/[deliverableId]/request-revision/route.ts`, `packages/db/src/services/deliverables.ts`
- **Acceptance criteria:**
  - `PATCH /api/deliverables/:id/status` — general status update (validates allowed transitions based on role)
  - `POST /api/deliverables/:id/submit` — marks deliverable for PM review, creates activity log entry
  - `POST /api/deliverables/:id/approve` — PM or client approval (validates role), updates status, if all deliverables in workstream approved then workstream marked complete, if all workstreams complete then contract enters handoff
  - `POST /api/deliverables/:id/request-revision` — increments contract's `feedbackRoundsUsed` (if client action), creates activity log, requires a `comment` field
  - All actions create entries in `activity_log` table
  - All actions trigger Supabase Realtime events
  - Status transition validation matrix enforced:
    - `not_started` → `in_progress`
    - `in_progress` → `in_review`, `blocked`
    - `in_review` → `approved`, `revision_requested`
    - `revision_requested` → `in_progress`
    - `blocked` → `in_progress`
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P3-M1-T04: Build file upload and management API

- **Depends on:** → P0-M2-T06, → P0-M5-T01
- **Touches:** `apps/web/app/api/deliverables/[deliverableId]/files/route.ts`, `apps/web/app/api/files/[fileId]/route.ts`, `apps/web/app/api/files/[fileId]/versions/route.ts`
- **Acceptance criteria:**
  - `POST /api/deliverables/:id/files` — upload file to Supabase Storage, create file record with version 1, attribution to user or agent
  - Subsequent uploads to same deliverable increment version number
  - `GET /api/files/:id` — returns presigned download URL
  - `GET /api/files/:id/versions` — returns all versions of this file
  - `isFinalSubmission` flag: if true, sets deliverable status to `in_review` and creates activity log entry
  - Max file size: 50MB
- **Effort:** 3h
- **Agent-suitable:** ✓

---

### Milestone P3-M2: Collaboration Interface — Communication

---

#### P3-M2-T01: Build messaging API

- **Depends on:** → P0-M2-T06
- **Touches:** `apps/web/app/api/contracts/[contractId]/messages/route.ts`, `packages/db/src/services/messages.ts`
- **Acceptance criteria:**
  - `POST /api/contracts/:id/messages` — create message with: channel type, channel ID, content (markdown), mentions, optional parent message ID (for threading)
  - `GET /api/contracts/:id/messages` — paginated, filterable by channel type/ID, sorted by created_at desc
  - Validates: user is contract participant (squad member or client), channel exists in this contract
  - Creates activity log entry for new messages
  - Supports both human (via session userId) and agent (via agent context in MCP — stub for now, implemented in P4)
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P3-M2-T02: Build Discussion Space UI

- **Depends on:** → P3-M2-T01, → P0-M5-T01
- **Touches:** `apps/web/app/(app)/contracts/[contractId]/discussion/page.tsx`
- **Acceptance criteria:**
  - Left sidebar: channel list — "General", per-workstream channels, per-deliverable channels
  - Main area: message list for selected channel, threaded replies (expandable), new message composer with markdown toolbar
  - Messages show: author avatar (circle/hexagon), name, timestamp, content (rendered markdown), thread reply count
  - Agent messages have teal left border and hexagonal avatar
  - Real-time via Supabase Realtime: new messages appear instantly for all participants
  - @mention autocomplete: starts with `@`, shows list of members and agents
  - File attachment support in messages (reuses file upload)
- **Effort:** 7h
- **Agent-suitable:** ◐

---

### Milestone P3-M3: PM Dashboard & Activity Feed

---

#### P3-M3-T01: Build Activity Feed component

- **Depends on:** → P0-M2-T06, → P0-M5-T01
- **Touches:** `apps/web/components/activity-feed.tsx`, `apps/web/app/(app)/contracts/[contractId]/page.tsx`
- **Acceptance criteria:**
  - Chronological feed of all activity for a contract
  - Each item shows: actor (avatar + name), action description, entity link, timestamp
  - Filterable by: actor (specific member/agent), action type, workstream
  - Human/agent toggle filter
  - Real-time: new items appear at top with slide-in animation
  - Used on the contract overview page and embeddable in the PM dashboard
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P3-M3-T02: Build PM Dashboard

- **Depends on:** → P3-M1-T01, → P3-M3-T01
- **Touches:** `apps/web/app/(app)/contracts/[contractId]/pm/page.tsx`
- **Acceptance criteria:**
  - Access restricted to contract's designated PM(s)
  - **Overview metrics:** % deliverables complete (progress bar), days remaining, feedback rounds used/total, active blocker count
  - **Blockers panel:** list of deliverables with status `blocked`, showing blocker description and who flagged it, quick-action "Reassign" and "Unblock" buttons
  - **Review queue:** deliverables with status `in_review`, sorted by submission date, click to open deliverable detail with approval actions
  - **Agent activity summary:** for each active agent, show: last active timestamp, tasks worked on in last 24h, daily log summary (if submitted)
  - **Risk indicators:** visual warnings for: deliverables past due, workstreams behind schedule (based on timeline), deliverables with no activity in 3+ days
  - **Quick actions:** reassign deliverable (change assignee dropdown), send squad update (compose message to general channel)
- **Effort:** 7h
- **Agent-suitable:** ◐

#### P3-M3-T03: Build Timeline (Gantt) view

- **Depends on:** → P0-M2-T05
- **Touches:** `apps/web/app/(app)/contracts/[contractId]/timeline/page.tsx`
- **Acceptance criteria:**
  - D3.js-based Gantt chart showing:
    - Workstreams as grouped rows
    - Deliverables as bars within workstream rows
    - Dependency arrows between workstreams
    - Current date vertical line with progress overlay
    - Color coding by status (matching Kanban card colors)
    - Milestone markers at workstream completion dates
  - Zoom: day/week/month granularity toggle
  - Scroll: horizontal scroll for long timelines, fixed left column with names
  - Interactive: hover for details, click to open deliverable detail
  - PM can drag to adjust dates (updates database via API)
  - Responsive: on mobile, show a simplified vertical timeline
- **Effort:** 8h
- **Agent-suitable:** ◐ (D3 + design)

---

### Milestone P3-M4: Client Review Interface

---

#### P3-M4-T01: Build Client Review page

- **Depends on:** → P3-M1-T02, → P3-M1-T03
- **Touches:** `apps/web/app/(app)/contracts/[contractId]/review/page.tsx`
- **Acceptance criteria:**
  - Only visible to the contract's client
  - Shows only deliverables that have been submitted for client review (status `in_review` with `submittedToClient` flag — or a dedicated client-facing status)
  - For each deliverable: final output preview, acceptance criteria as a checklist (client can mentally check off, not binding), who produced it (member and agent with contribution breakdown), PM's submission notes
  - Actions: "Approve" (with optional comment), "Request Revision" (requires comment text, counts against feedback rounds)
  - Feedback round counter: "Round 2 of 3" prominently displayed
  - Warning when on last feedback round: "This is your final revision request"
  - On all deliverables approved: "Complete Contract" button appears
- **Effort:** 5h
- **Agent-suitable:** ◐

---

## Phase 4: MCP Agent Integration

**Goal:** External AI agents can connect to contracts and participate as team members.

**Duration:** Weeks 10–14
**Depends on:** P3-M1-T03, P3-M1-T04, P3-M2-T01

---

### Milestone P4-M1: MCP Server Implementation

---

#### P4-M1-T01: Implement MCP server factory with all tools

- **Depends on:** → P3-M1-T03, → P3-M1-T04, → P3-M2-T01
- **Touches:** `packages/mcp-server/src/server.ts`, `packages/mcp-server/src/tools/*.ts`
- **Acceptance criteria:**
  - `createSquadSwarmMcpServer()` returns a configured `McpServer` instance with all 12 tools from the architecture doc Section 10.3:
    - Task management: `get_my_tasks`, `update_task_status`, `flag_blocker`, `get_project_context`
    - File operations: `list_files`, `read_file`, `upload_file`
    - Communication: `post_message`, `get_messages`
    - Status & reporting: `get_contract_summary`, `submit_daily_log`, `get_acceptance_criteria`
  - Each tool has: proper Zod input schema, description, implementation that calls the same service functions as the REST API
  - Agent behavioral guidelines exposed as an MCP resource
  - All tool implementations tested with mock data
- **Effort:** 10h
- **Agent-suitable:** ✓

#### P4-M1-T02: Implement MCP Streamable HTTP endpoint

- **Depends on:** → P4-M1-T01
- **Touches:** `apps/web/app/api/mcp/sse/route.ts`, `packages/mcp-server/src/auth.ts`
- **Acceptance criteria:**
  - POST, GET, DELETE handlers as specified in architecture doc Section 10.2
  - Agent authentication via Bearer token in Authorization header
  - Session management: sessions stored in Upstash Redis (not in-memory Map for production)
  - Session cleanup on disconnect
  - Rate limiting: 300 req/min per agent API key
  - Agent presence tracking: on session start, add agent to Supabase Realtime presence for the contract; on disconnect, remove
  - Tested with MCP Inspector (`npx @modelcontextprotocol/inspector`)
- **Effort:** 6h
- **Agent-suitable:** ✓

#### P4-M1-T03: Build agent activity attribution system

- **Depends on:** → P4-M1-T01
- **Touches:** `packages/db/src/services/activity-log.ts`, `packages/mcp-server/src/tools/*.ts`
- **Acceptance criteria:**
  - Every tool invocation by an agent creates an `activity_log` entry with both `actor_agent_id` and `actor_user_id` (the agent's owner)
  - File uploads by agents set `uploaded_by_agent_id` on the file record
  - Messages by agents set `author_agent_id` on the message record
  - The UI displays agent actions with the hexagonal badge and teal styling
  - Agent daily logs (`submit_daily_log`) stored in `agent_logs` table and surfaced in PM Dashboard
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P4-M1-T04: Integration test — full agent workflow

- **Depends on:** → P4-M1-T01, → P4-M1-T02, → P4-M1-T03
- **Touches:** `packages/mcp-server/tests/integration/`
- **Acceptance criteria:**
  - Test script that:
    1. Creates a test contract with deliverables
    2. Registers a test agent
    3. Connects to MCP endpoint with agent API key
    4. Calls `get_my_tasks` and receives assigned deliverables
    5. Calls `get_project_context` and receives full project state
    6. Calls `upload_file` with a test file
    7. Calls `update_task_status` to move to in_review
    8. Calls `post_message` to the deliverable channel
    9. Calls `submit_daily_log`
    10. Verifies all actions appear in activity log with correct attribution
  - Test passes end-to-end against a real Neon dev branch
- **Effort:** 4h
- **Agent-suitable:** ✓

---

## Phase 5: Payments & Completion

**Goal:** Contracts can be paid for (Stripe in v1), completed, and handed off.

**Duration:** Weeks 12–16
**Depends on:** P3-M4-*

---

### Milestone P5-M1: Stripe Payment Integration

---

#### P5-M1-T01: Configure Stripe Connect for escrow model

- **Depends on:** → P0-M2-T05
- **Touches:** `apps/web/lib/stripe.ts`, `apps/web/app/api/webhooks/stripe/route.ts`
- **Acceptance criteria:**
  - Stripe account configured with Connect (for squad payouts)
  - `stripe.ts` exports configured Stripe client
  - Webhook endpoint verifies Stripe signatures
  - Test mode works end-to-end
- **Effort:** 3h
- **Agent-suitable:** ◐ (Stripe dashboard)

#### P5-M1-T02: Build payment deposit flow

- **Depends on:** → P5-M1-T01, → P2-M2-T03
- **Touches:** `apps/web/app/api/contracts/[contractId]/deposit/route.ts`
- **Acceptance criteria:**
  - `POST /api/contracts/:id/deposit` creates a Stripe Checkout session for the full contract amount
  - On successful payment (webhook): contract status moves from `pending_deposit` to `active`
  - Upfront percentage transferred immediately to squad's Stripe Connect account
  - Remainder held in platform's Stripe balance (escrow equivalent)
  - Contract start timestamp set
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P5-M1-T03: Build payment release on completion

- **Depends on:** → P5-M1-T02
- **Touches:** `apps/web/app/api/contracts/[contractId]/complete/route.ts`, `packages/db/src/services/payments.ts`
- **Acceptance criteria:**
  - `POST /api/contracts/:id/complete` (client only, when all deliverables approved):
    - Sets contract status to `completed`
    - Triggers Stripe transfer of remaining escrowed funds to squad's Connect account
    - Creates completion activity log entry
    - Triggers attestation creation job (stub — implemented in P6/P7)
    - Triggers trust score update job (stub)
  - If milestone payments configured: partial releases triggered as workstreams complete
- **Effort:** 4h
- **Agent-suitable:** ✓

---

### Milestone P5-M2: Contract Handoff

---

#### P5-M2-T01: Build handoff package assembly

- **Depends on:** → P5-M1-T03
- **Touches:** `packages/db/src/services/contracts.ts`
- **Acceptance criteria:**
  - When contract completes, system assembles a handoff package:
    - All approved deliverable files (final versions only)
    - Project summary document (auto-generated: scope, work plan, timeline, participants, completion notes)
    - Agent contribution log (which agents worked on what, hours logged)
  - Handoff package accessible from the contract detail page
  - Client can download all files as a ZIP
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P5-M2-T02: Build dispute initiation and resolution UI

- **Depends on:** → P0-M2-T06
- **Touches:** `apps/web/app/api/contracts/[contractId]/disputes/route.ts`, dispute UI components
- **Acceptance criteria:**
  - "Raise Dispute" button on contract page (visible to client and squad members when contract is active)
  - Dispute creation form: reason (text), evidence upload (files)
  - Dispute view: shows reason, evidence from both sides, resolution deadline countdown
  - Direct negotiation: both parties can propose resolutions (a proposed fund split)
  - Accept resolution: both parties must accept for it to execute
  - Auto-split: if resolution deadline passes, execute the default split from contract terms
  - Payment redistribution happens via Stripe API (release to squad/refund to client per agreed or default split)
- **Effort:** 8h
- **Agent-suitable:** ◐

---

## Phase 6: Trust & Discovery

**Goal:** Reputation system, suggestion engine, and enhanced search.

**Duration:** Weeks 14–18
**Depends on:** P5-M1-*

---

### Milestone P6-M1: Database-Backed Reputation (Web2 Mode)

---

#### P6-M1-T01: Build client satisfaction rating flow

- **Depends on:** → P5-M1-T03
- **Touches:** `apps/web/app/api/contracts/[contractId]/rate/route.ts`, rating UI
- **Acceptance criteria:**
  - After contract completion, client prompted to rate the squad
  - Rating form: overall (1–5 stars), quality (1–5), communication (1–5), timeliness (1–5), would rehire (yes/no), narrative feedback (optional text)
  - Rating stored in a `contract_ratings` table
  - Trust score recomputation triggered after rating
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P6-M1-T02: Implement trust score computation

- **Depends on:** → P6-M1-T01
- **Touches:** `packages/db/src/services/trust-scores.ts`, `trigger/trust-score-update.ts`
- **Acceptance criteria:**
  - Trust score computation follows the formula from PRD Section 12.3
  - Runs as a Trigger.dev job, triggered by: contract completion, rating submission, dispute resolution
  - Updates `users.trustScore` (member) and `squads.trustScore` (squad)
  - Score normalized to 0–100
  - Tested with synthetic data: new squad scores low, experienced squad with good ratings scores high, disputes reduce score
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P6-M1-T03: Display trust scores throughout the UI

- **Depends on:** → P6-M1-T02
- **Touches:** Various components (squad profile, scope board cards, bid review)
- **Acceptance criteria:**
  - Trust score badge component: displays score with color coding (red <30, yellow 30–60, green 60–80, gold >80)
  - Shown on: squad profile, scope board cards (for client reputation), bid review (for squad reputation), member profiles
  - Trust threshold filtering works on the scope board (scopes hidden if user's squad doesn't meet threshold)
- **Effort:** 3h
- **Agent-suitable:** ✓

---

### Milestone P6-M2: Suggestion Engine

---

#### P6-M2-T01: Implement scope-to-squad matching

- **Depends on:** → P1-M3-T01, → P2-M1-T01
- **Touches:** `packages/ai/src/suggestion-engine.ts`, `trigger/suggestion-engine-refresh.ts`
- **Acceptance criteria:**
  - Daily Trigger.dev job computes recommendations for each active squad
  - Matching logic: compares squad's member skills and past contract categories against active scope requirements
  - Uses Claude API (Sonnet) for semantic matching (not just keyword overlap)
  - Stores top 10 recommended scope IDs per squad in a cache (Redis or dedicated table)
  - `GET /api/scopes/recommended` returns cached recommendations for the requesting user's squads
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P6-M2-T02: Build "Recommended for You" section on Scope Board

- **Depends on:** → P6-M2-T01
- **Touches:** `apps/web/app/(app)/scopes/page.tsx`
- **Acceptance criteria:**
  - Top section of Scope Board shows "Recommended for Your Squads" with a horizontal scrollable card row
  - Cards show match percentage badge ("92% match")
  - Collapsible/dismissible
  - Falls back gracefully if no recommendations available
- **Effort:** 3h
- **Agent-suitable:** ✓

---

## Phase 7: Web3 Module

**Goal:** Smart contracts, EAS attestations, wallet auth, and IPFS — all as progressive enhancements.

**Duration:** Weeks 16–22
**Depends on:** P5-M1-*, P6-M1-*

---

### Milestone P7-M1: Wallet Auth & Squad Wallet

---

#### P7-M1-T01: Implement Sign-In with Ethereum (SIWE)

- **Depends on:** → P0-M3-T01
- **Touches:** `apps/web/app/api/auth/siwe/route.ts`, `packages/web3/src/wagmi.ts`, wallet connection components
- **Acceptance criteria:**
  - RainbowKit + wagmi configured per architecture doc Section 16
  - "Connect Wallet" button on login page and in settings
  - SIWE flow: generate nonce → wallet signs message → server verifies → link wallet to user account
  - Users can have both email and wallet auth (wallet links to existing account if email matches, or creates new account)
  - `users.walletAddress` and `users.web3Enabled` updated on wallet connection
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P7-M1-T02: Implement squad multisig creation via Gnosis Safe

- **Depends on:** → P7-M1-T01, → P2-M1-T01
- **Touches:** `packages/web3/src/safe.ts`, squad settings UI
- **Acceptance criteria:**
  - "Create Squad Wallet" action in squad settings (visible when all members have wallets connected)
  - Deploys a Gnosis Safe with squad members as owners, threshold configurable (default: majority)
  - Safe address stored in `squads.multisigAddress`
  - Squad `paymentMode` can be switched to `crypto` once wallet is created
- **Effort:** 5h
- **Agent-suitable:** ◐

---

### Milestone P7-M2: Smart Contract Escrow

---

#### P7-M2-T01: Develop and test SquadSwarmEscrow.sol

- **Depends on:** ⊘ (can start independently)
- **Touches:** `contracts/src/SquadSwarmEscrow.sol`, `contracts/test/SquadSwarmEscrow.t.sol`
- **Acceptance criteria:**
  - Contract implements all functions from architecture doc Section 14.2
  - Foundry tests cover: deployment, deposit, milestone release, full release, dispute raise, dispute resolve, auto-split, edge cases (double deposit, unauthorized release, expired dispute period)
  - 100% line coverage on the escrow contract
  - Gas optimization: deployment < 3M gas, deposit < 100K gas, release < 80K gas
- **Effort:** 12h
- **Agent-suitable:** ◐

#### P7-M2-T02: Develop PaymentSplitter.sol

- **Depends on:** → P7-M2-T01
- **Touches:** `contracts/src/PaymentSplitter.sol`, `contracts/test/PaymentSplitter.t.sol`
- **Acceptance criteria:**
  - Receives USDC from escrow release, distributes to member wallets per configured ratios
  - Split ratios immutable per-contract (set at deployment)
  - Tests: equal split, weighted split, edge cases (rounding, zero allocations)
- **Effort:** 4h
- **Agent-suitable:** ✓

#### P7-M2-T03: Deploy contracts to Base Sepolia testnet

- **Depends on:** → P7-M2-T01, → P7-M2-T02
- **Touches:** `contracts/script/`, `.github/workflows/deploy-contracts.yml`
- **Acceptance criteria:**
  - Foundry deploy script for testnet
  - Contracts deployed and verified on Base Sepolia Blockscout
  - ABI artifacts exported to `packages/web3/contracts/`
  - TypeScript bindings generated via `wagmi generate`
  - GitHub Action for contract deployment (manual trigger)
- **Effort:** 3h
- **Agent-suitable:** ✓

#### P7-M2-T04: Integrate crypto escrow into contract creation flow

- **Depends on:** → P7-M2-T03, → P7-M1-T02, → P2-M2-T03
- **Touches:** `packages/web3/src/escrow.ts`, contract creation trigger job
- **Acceptance criteria:**
  - When a bid is accepted and the squad has `paymentMode === 'crypto'`:
    - Deploy SquadSwarmEscrow contract with bid terms
    - Store contract address in `contracts.smartContractAddress`
    - Client deposits USDC via wallet transaction (UI prompts wallet interaction)
    - Upfront percentage released to squad Safe upon deposit confirmation
  - Fiat path (Stripe) still works for squads without crypto
  - Both paths converge to the same contract status management
- **Effort:** 6h
- **Agent-suitable:** ◐

---

### Milestone P7-M3: EAS Attestations

---

#### P7-M3-T01: Register EAS schemas on Base

- **Depends on:** ⊘
- **Touches:** `packages/web3/src/eas/schemas.ts`, deployment script
- **Acceptance criteria:**
  - All 6 attestation schemas from PRD Section 12.2 registered on EAS (Base Sepolia for testnet, Base for mainnet)
  - Schema UIDs stored in constants file
  - Schema registration script for reproducibility
- **Effort:** 2h
- **Agent-suitable:** ✓

#### P7-M3-T02: Implement attestation creation on contract completion

- **Depends on:** → P7-M3-T01, → P5-M1-T03
- **Touches:** `packages/web3/src/eas/create-attestation.ts`, `trigger/attestation-creation.ts`
- **Acceptance criteria:**
  - Trigger.dev job fires on contract completion (when Web3 enabled for the squad)
  - Creates: contract completion attestation (squad), client satisfaction attestation (from rating data), agent capability attestation (per agent that contributed)
  - Attestation UIDs stored in database for reference
  - Trust score recomputation triggered after attestation creation
- **Effort:** 5h
- **Agent-suitable:** ✓

#### P7-M3-T03: Build attestation display on profiles

- **Depends on:** → P7-M3-T02
- **Touches:** Profile UI components
- **Acceptance criteria:**
  - Squad profile shows EAS attestation badges (linked to EAS explorer)
  - Member profile shows individual attestations
  - "Verified on-chain" badge next to trust scores when EAS data is present
  - Non-Web3 users see database-backed trust scores without EAS branding
- **Effort:** 3h
- **Agent-suitable:** ✓

---

## Phase 8: Polish & Launch

**Goal:** End-to-end testing, performance optimization, documentation, and launch preparation.

**Duration:** Weeks 20–24
**Depends on:** All previous phases (core: P0–P5 mandatory; P6, P7 can ship incrementally)

---

### Milestone P8-M1: End-to-End Testing

---

#### P8-M1-T01: Write E2E test suite for critical paths

- **Depends on:** → P5-M2-*
- **Touches:** `apps/web/tests/e2e/`
- **Acceptance criteria:**
  - Playwright E2E tests for:
    1. Sign up → create squad → register agent → browse scopes (happy path)
    2. Submit scope → AI analysis → publish → appears on board
    3. Create bid → governance approval → submit → client accepts → contract created
    4. Collaboration: upload deliverable → PM approval → client review → approve
    5. Payment: deposit → work → complete → payment released
    6. Dispute: raise → negotiate → resolve (or auto-split)
  - All tests pass against a staging deployment with Neon dev branch
  - CI runs E2E tests on every merge to `main`
- **Effort:** 12h
- **Agent-suitable:** ◐

#### P8-M1-T02: Load testing and performance optimization

- **Depends on:** → P8-M1-T01
- **Touches:** Various
- **Acceptance criteria:**
  - Scope Board page loads in < 1.5s (LCP)
  - API response for simple CRUD: p95 < 200ms
  - MCP tool response: p95 < 1s
  - Realtime event delivery: < 500ms from write to client
  - Identified and resolved: any N+1 queries, missing indexes, unnecessary client-side fetches
  - React Server Components used for all data-heavy pages (no client-side fetch waterfall)
- **Effort:** 8h
- **Agent-suitable:** ◐

---

### Milestone P8-M2: Documentation & Launch Prep

---

#### P8-M2-T01: Write user-facing documentation

- **Depends on:** → P8-M1-T01
- **Touches:** Documentation site or in-app help
- **Acceptance criteria:**
  - Getting started guide: sign up → create squad → first bid
  - Client guide: scope submission → AI analysis → managing contracts
  - Agent integration guide: register agent → MCP connection → tool reference
  - Governance guide: setting up squad governance models
  - FAQ page
- **Effort:** 8h
- **Agent-suitable:** ◐

#### P8-M2-T02: Create landing page

- **Depends on:** → P0-M1-T03
- **Touches:** `apps/web/app/(marketing)/page.tsx`
- **Acceptance criteria:**
  - Hero section explaining SquadSwarm's value proposition
  - How it works: 4-step visual (Submit scope → Squads bid → Collaborate with swarms → Deliver & get paid)
  - Feature highlights: AI scope analysis, MCP agent integration, smart contract escrow, trust system
  - CTA: "Get Started" and "Browse the Scope Board"
  - Responsive, fast, visually compelling (follows design system)
- **Effort:** 6h
- **Agent-suitable:** ◐ (heavy design)

#### P8-M2-T03: Developer documentation for MCP server

- **Depends on:** → P4-M1-*
- **Touches:** Documentation
- **Acceptance criteria:**
  - Complete MCP tool reference: every tool with name, description, input schema, output schema, example request/response
  - Authentication guide: how to register an agent, get an API key, connect via MCP
  - Agent behavioral guidelines document
  - Example integration: "Connect a Claude agent to SquadSwarm in 10 minutes"
  - OpenAPI/JSON Schema export of all MCP tools
- **Effort:** 5h
- **Agent-suitable:** ✓

---

## Summary: Task Count & Effort Estimates

| Phase | Milestones | Tasks | Total Estimated Hours |
|---|---|---|---|
| P0: Foundation | 5 | 23 | ~52h |
| P1: Scope Pipeline | 3 | 10 | ~46h |
| P2: Squad & Bidding | 2 | 9 | ~46h |
| P3: Contract & Collaboration | 4 | 10 | ~55h |
| P4: MCP Agent Integration | 1 | 4 | ~23h |
| P5: Payments & Completion | 2 | 5 | ~23h |
| P6: Trust & Discovery | 2 | 5 | ~19h |
| P7: Web3 Module | 3 | 10 | ~45h |
| P8: Polish & Launch | 2 | 5 | ~39h |
| **TOTAL** | **24** | **81** | **~348h** |

---

## Dependency Graph — Critical Path

```
P0-M1 (Repo setup)
  ├─→ P0-M2 (Database schema)
  │     ├─→ P0-M3 (Auth)
  │     │     ├─→ P0-M4 (App shell)
  │     │     │     ├─→ P1-M1 (Scope submission)
  │     │     │     │     ├─→ P1-M2 (AI analysis)
  │     │     │     │     │     └─→ P1-M3 (Scope Board)
  │     │     │     │     │           └─→ P2-M2 (Bidding)
  │     │     │     │     │                 └─→ P3-M1 (Collaboration core)
  │     │     │     │     │                       ├─→ P3-M2 (Communication)
  │     │     │     │     │                       ├─→ P3-M3 (PM Dashboard)
  │     │     │     │     │                       ├─→ P3-M4 (Client Review)
  │     │     │     │     │                       │     └─→ P5-M1 (Payments) ← CRITICAL PATH
  │     │     │     │     │                       │           └─→ P5-M2 (Handoff)
  │     │     │     │     │                       │                 └─→ P8 (Launch)
  │     │     │     │     │                       └─→ P4-M1 (MCP) ← PARALLEL TRACK
  │     │     │     ├─→ P2-M1 (Squad management) ← can start during P1
  │     │     │     └─→ P6 (Trust) ← can start during P5
  │     └─→ P0-M5 (External services)
  └─→ P7-M2-T01 (Smart contracts) ← INDEPENDENT, can start week 1

LEGEND:
  ├─→  depends on (must complete first)
  ← PARALLEL TRACK  (can run simultaneously with critical path)
```

---

## Parallel Work Allocation (Recommended Swarm Configuration)

For a swarm of agents working this plan, the recommended allocation:

**Track A — Core Application (Critical Path):**
P0 → P1 → P2-M2 → P3 → P5 → P8

**Track B — Squad & Agents (Parallel):**
P2-M1 (starts week 5) → P4 (starts week 10)

**Track C — Smart Contracts (Independent):**
P7-M2-T01, P7-M2-T02 (can start week 1) → P7-M2-T03 → P7-M2-T04 (joins main track after P5)

**Track D — Trust & Discovery (Late parallel):**
P6 (starts week 14) → P7-M3 (starts week 16)

**Track E — Design & Polish (Ongoing):**
Landing page, documentation, E2E tests (starts week 18)

With 3–4 agents working in parallel across these tracks, the total calendar time compresses from 24 weeks sequential to approximately 14–16 weeks.

---

*This implementation plan is a companion to the SquadSwarm PRD v1.0 and Technical Architecture v1.0. Task IDs are stable and can be referenced in commit messages, PR descriptions, and project management tools.*

*SquadSwarm is a project by Benjamin Life (@omniharmonic). Licensed under CC BY-SA 4.0.*
