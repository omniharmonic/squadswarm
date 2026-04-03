# SquadSwarm — Technical Architecture Document

**Author:** Benjamin Life (@omniharmonic)
**Date:** April 3, 2026
**Status:** Draft
**Companion to:** SquadSwarm PRD v1.0
**License:** CC BY-SA 4.0

---

## Table of Contents

1. [Architecture Philosophy](#1-architecture-philosophy)
2. [System Topology](#2-system-topology)
3. [Deployment Architecture](#3-deployment-architecture)
4. [Frontend Application](#4-frontend-application)
5. [Backend API Server](#5-backend-api-server)
6. [Database Layer (Neon PostgreSQL)](#6-database-layer-neon-postgresql)
7. [Real-Time Layer (Supabase)](#7-real-time-layer-supabase)
8. [AI Scope Analyst (Claude API)](#8-ai-scope-analyst-claude-api)
9. [Agent Integration: Claude Agent SDK](#9-agent-integration-claude-agent-sdk)
10. [MCP Server: SquadSwarm Project Server](#10-mcp-server-squadswarm-project-server)
11. [File Storage & Content Delivery](#11-file-storage--content-delivery)
12. [Authentication & Identity](#12-authentication--identity)
13. [Background Jobs & Event Processing](#13-background-jobs--event-processing)
14. [Web3 Module: Smart Contracts](#14-web3-module-smart-contracts)
15. [Web3 Module: EAS Attestations](#15-web3-module-eas-attestations)
16. [Web3 Module: Wallet Infrastructure](#16-web3-module-wallet-infrastructure)
17. [Search & Discovery Engine](#17-search--discovery-engine)
18. [Observability & Monitoring](#18-observability--monitoring)
19. [Security Architecture](#19-security-architecture)
20. [Environment & Configuration Management](#20-environment--configuration-management)
21. [Repository Structure](#21-repository-structure)
22. [Local Development Setup](#22-local-development-setup)
23. [Deployment Pipeline](#23-deployment-pipeline)
24. [Migration Strategy: Web2 → Web3 Progressive Enhancement](#24-migration-strategy-web2--web3-progressive-enhancement)
25. [Component Dependency Matrix](#25-component-dependency-matrix)
26. [Performance Targets & Scaling Strategy](#26-performance-targets--scaling-strategy)

---

## 1. Architecture Philosophy

### 1.1 Guiding Principles

**Simple by default, powerful when needed.** The core platform — scope submission, bidding, project management, payments — should work with a standard web stack: Next.js on Vercel, Postgres on Neon, real-time on Supabase. No blockchain required to use the basic product. Web3 features (escrow, attestations, wallet-based identity) are modular add-ons that enhance but do not gate core functionality.

**Claude-native AI.** Every AI feature in SquadSwarm is built on Anthropic's stack: the Claude API for the Scope Analyst, the Claude Agent SDK for backend agent orchestration, and MCP for the agent collaboration interface. This isn't an abstraction layer over multiple providers — it's a deep integration with one provider, chosen for capability and alignment with the project's values.

**Human-agent parity at the protocol level.** The same API endpoints that serve the web UI also serve the MCP server. An agent updating a task status calls the same backend function as a human clicking a button. The distinction between human and agent actions lives in attribution metadata, not in separate code paths.

**Web3 as a module, not a dependency.** Every Web3 component (smart contracts, EAS attestations, wallet auth) is encapsulated behind an interface. The application can run entirely in "Web2 mode" with email auth, Stripe payments, and database-backed reputation. Web3 features activate per-user or per-squad when they connect a wallet. This is not a philosophical compromise — it's a deployment reality that allows the product to reach users who aren't yet in the crypto ecosystem.

### 1.2 Architecture Decision Records (Key Choices)

| Decision | Choice | Rationale |
|---|---|---|
| Frontend framework | Next.js 15 (App Router) on Vercel | SSR/SSG flexibility, Vercel's edge network, excellent DX, React Server Components for performance |
| Primary database | Neon (serverless Postgres) | Serverless scaling matches Vercel's model, branching for preview environments, zero cold start |
| Real-time & auth fallback | Supabase | Realtime subscriptions via Postgres changes, built-in auth as fallback to SIWE, storage buckets for files |
| AI provider | Claude API + Claude Agent SDK | Scope Analyst needs Opus-class reasoning; Agent SDK provides the full agent loop for backend orchestration |
| Agent protocol | MCP (Streamable HTTP) | Open standard, supported by all major AI clients, TypeScript-native SDK, future-proof |
| Blockchain L2 | Base (primary), Celo (secondary) | Base for ecosystem and Coinbase onboarding; Celo for mobile-first and regenerative community alignment |
| Smart contract framework | Foundry | Fastest test suite, Solidity-native, excellent for CI/CD |
| Monorepo tooling | Turborepo | Vercel-native, handles shared packages between frontend/backend/contracts |

---

## 2. System Topology

### 2.1 High-Level Component Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENTS                                       │
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────────┐    │
│  │ Web Browser  │   │ AI Agent     │   │ Wallet                   │    │
│  │ (Next.js UI) │   │ (via MCP)    │   │ (MetaMask, Coinbase, etc)│    │
│  └──────┬───────┘   └──────┬───────┘   └────────────┬─────────────┘    │
│         │                  │                         │                  │
└─────────┼──────────────────┼─────────────────────────┼──────────────────┘
          │                  │                         │
          ▼                  ▼                         ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        VERCEL EDGE NETWORK                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │                    Next.js Application                           │   │
│  │                                                                  │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │   │
│  │  │ React Server │  │ API Routes   │  │ MCP Endpoint          │  │   │
│  │  │ Components   │  │ /api/*       │  │ /api/mcp/sse          │  │   │
│  │  │ (UI render)  │  │ (REST + WS)  │  │ (Streamable HTTP)     │  │   │
│  │  └──────────────┘  └──────┬───────┘  └───────────┬───────────┘  │   │
│  │                           │                      │              │   │
│  └───────────────────────────┼──────────────────────┼──────────────┘   │
│                              │                      │                  │
└──────────────────────────────┼──────────────────────┼──────────────────┘
                               │                      │
          ┌────────────────────┼──────────────────────┼────────┐
          │                    ▼                      ▼        │
          │  ┌──────────────────────────────────────────────┐  │
          │  │           APPLICATION SERVICES                │  │
          │  │                                               │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ Claude API  │  │ Claude Agent SDK        │ │  │
          │  │  │ (Scope      │  │ (Backend agent          │ │  │
          │  │  │  Analyst)   │  │  orchestration)         │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ Trigger.dev │  │ Resend                  │ │  │
          │  │  │ (Background │  │ (Email)                 │ │  │
          │  │  │  jobs)      │  │                         │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  └──────────────────────────────────────────────┘  │
          │                                                    │
          │  ┌──────────────────────────────────────────────┐  │
          │  │              DATA LAYER                       │  │
          │  │                                               │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ Neon        │  │ Supabase                │ │  │
          │  │  │ (Postgres   │  │ (Realtime, Auth,        │ │  │
          │  │  │  primary)   │  │  Storage)               │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ Upstash     │  │ Meilisearch            │ │  │
          │  │  │ (Redis for  │  │ (Scope search           │ │  │
          │  │  │  cache/     │  │  & filtering)           │ │  │
          │  │  │  rate limit)│  │                         │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  └──────────────────────────────────────────────┘  │
          │                                                    │
          │  ┌──────────────────────────────────────────────┐  │
          │  │         WEB3 MODULE (Optional)                │  │
          │  │                                               │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ Smart       │  │ EAS                     │ │  │
          │  │  │ Contracts   │  │ (Attestations)          │ │  │
          │  │  │ (Base/Celo) │  │                         │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  │  ┌─────────────┐  ┌────────────────────────┐ │  │
          │  │  │ The Graph   │  │ Gnosis Safe SDK         │ │  │
          │  │  │ (Indexing)  │  │ (Multisig wallets)      │ │  │
          │  │  └─────────────┘  └────────────────────────┘ │  │
          │  └──────────────────────────────────────────────┘  │
          └────────────────────────────────────────────────────┘
```

### 2.2 Data Flow Summary

Every request into the system follows one of three paths:

**Path A — Human via Web UI:**
Browser → Vercel Edge → Next.js RSC/API Route → Neon (read/write) → Response
Side effects: Supabase Realtime broadcast, Trigger.dev job dispatch, Claude API call

**Path B — Agent via MCP:**
Agent Client → MCP Endpoint (/api/mcp/sse) → MCP Tool Handler → Same Neon read/write → Response via SSE
Side effects: identical to Path A (realtime broadcast, job dispatch)

**Path C — Blockchain interaction:**
Browser/Agent → Wallet signing → RPC to Base/Celo → Smart contract execution → Event emitted
Event indexing: The Graph subgraph → Webhook to API Route → Neon state sync

All three paths converge on the same Neon database as the source of truth for application state. The blockchain is the source of truth for financial state (escrow balances, payment distributions) and reputation state (EAS attestations). The application syncs blockchain state into Neon for query performance.

---

## 3. Deployment Architecture

### 3.1 Vercel Deployment Model

The entire application deploys as a single Next.js project on Vercel. This is intentional — it eliminates the operational complexity of managing separate frontend and backend services.

```
squadswarm/
├── apps/
│   └── web/                    ← Next.js 15 application (deploys to Vercel)
│       ├── app/                ← App Router (pages, layouts, API routes)
│       │   ├── (marketing)/    ← Public marketing pages
│       │   ├── (app)/          ← Authenticated application shell
│       │   │   ├── dashboard/
│       │   │   ├── scopes/
│       │   │   ├── squads/
│       │   │   ├── contracts/
│       │   │   └── settings/
│       │   └── api/            ← API routes (REST + MCP)
│       │       ├── auth/
│       │       ├── scopes/
│       │       ├── bids/
│       │       ├── contracts/
│       │       ├── squads/
│       │       ├── agents/
│       │       ├── files/
│       │       ├── messages/
│       │       ├── mcp/        ← MCP Streamable HTTP endpoint
│       │       └── webhooks/   ← The Graph, Stripe, etc.
│       ├── components/
│       ├── lib/
│       └── public/
├── packages/
│   ├── db/                     ← Drizzle schema + migrations (shared)
│   ├── ai/                     ← Claude API + Agent SDK wrappers
│   ├── mcp-server/             ← MCP tool definitions
│   ├── web3/                   ← Smart contract ABIs, wagmi config, EAS helpers
│   ├── shared/                 ← Types, constants, validation schemas (Zod)
│   └── ui/                     ← Shared React components
├── contracts/                  ← Solidity (Foundry project)
│   ├── src/
│   ├── test/
│   └── script/
├── turbo.json
├── package.json
└── .env.example
```

### 3.2 Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "turbo build --filter=web",
  "functions": {
    "app/api/mcp/**": {
      "maxDuration": 300
    },
    "app/api/scopes/*/analyze/**": {
      "maxDuration": 120
    }
  },
  "crons": [
    {
      "path": "/api/cron/sync-blockchain",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/bid-deadline-check",
      "schedule": "0 * * * *"
    }
  ]
}
```

Key Vercel features used:
- **Edge Functions** for auth middleware and rate limiting
- **Serverless Functions** (Node.js runtime) for API routes and MCP endpoint
- **Streaming** for the MCP SSE transport and Claude API streaming responses
- **Cron Jobs** for periodic blockchain sync and deadline enforcement
- **Preview Deployments** with Neon database branches for PR previews
- **KV** (Vercel KV / Upstash Redis) for caching and rate limiting

### 3.3 Why Not a Separate Backend?

A common objection: "Won't you need a separate server for WebSockets, long-running jobs, and MCP?" The answer in 2026 is no, for this scale:

- **WebSockets/Real-time:** Supabase Realtime handles this entirely. The client subscribes to Postgres changes via Supabase's channel system. The backend writes to Neon, Supabase picks up the change and broadcasts. No custom WebSocket server needed.
- **Long-running jobs:** Trigger.dev runs background jobs (AI analysis, attestation creation, email dispatch) outside Vercel's function timeout. The API route dispatches the job and returns immediately.
- **MCP endpoint:** Streamable HTTP over SSE works within Vercel's serverless function model. The 300-second max duration is sufficient for MCP sessions, which are request-response, not persistent connections. For longer agent sessions, the MCP protocol supports reconnection with session IDs.

If the platform outgrows this model (say, 10,000+ concurrent MCP connections), the MCP endpoint can be extracted to a dedicated Fly.io service without changing any other component.

---

## 4. Frontend Application

### 4.1 Stack

| Concern | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS + CSS variables | 4.x |
| State (client) | Zustand | 5.x |
| State (server) | TanStack Query | 5.x |
| Forms | React Hook Form + Zod | 7.x |
| Rich text | Tiptap (ProseMirror) | 2.x |
| Charts/Gantt | D3.js | 7.x |
| Wallet | RainbowKit + wagmi + viem | Latest |
| Notifications | Sonner (toasts) | Latest |
| Drag & drop | dnd-kit | Latest |

### 4.2 Application Shell & Routing

```
/(marketing)
  /                           → Landing page
  /about                      → About SquadSwarm
  /pricing                    → Pricing tiers (if applicable)

/(auth)
  /login                      → Email magic link + SIWE option
  /signup                     → Onboarding flow

/(app)                        → Authenticated layout with sidebar nav
  /dashboard                  → Personalized home: active contracts, recommended scopes, squad activity
  /scopes
    /                         → Scope Board (browse/search)
    /new                      → Scope Submission Interface
    /[scopeId]                → Scope detail + bid list (client) or bid action (squad)
    /[scopeId]/analyze        → AI Analysis conversation
  /squads
    /                         → My Squads list
    /new                      → Create Squad
    /[squadId]                → Squad profile & management
    /[squadId]/agents         → Agent registry
    /[squadId]/governance     → Governance settings
    /[squadId]/finances       → Financial dashboard
  /contracts
    /[contractId]             → Collaboration Interface (the main workspace)
    /[contractId]/board       → Kanban view
    /[contractId]/timeline    → Gantt view
    /[contractId]/files       → Files space
    /[contractId]/discussion  → Discussion channels
    /[contractId]/pm          → PM Dashboard
    /[contractId]/review      → Client review interface
  /bids
    /[bidId]                  → Bid detail / edit
  /profile
    /                         → My profile
    /reputation               → Trust score & attestation history
  /settings
    /                         → Account settings
    /wallet                   → Wallet connection & management
    /notifications            → Notification preferences
```

### 4.3 Key Frontend Architecture Patterns

**React Server Components for data-heavy pages.** The Scope Board, Squad profiles, and Contract overviews are RSC pages that fetch data server-side from Neon (via Drizzle) and render on the edge. No client-side data fetching waterfall.

**Client Components for interactive features.** The Kanban board (drag-and-drop), the Bid Builder (complex forms), the AI Analysis conversation (streaming), and the Gantt chart (D3) are client components that use TanStack Query for data synchronization.

**Supabase Realtime for live updates.** The Collaboration Interface subscribes to Supabase Realtime channels scoped to the contract ID. When any participant (human or agent) writes to Neon, Supabase broadcasts the change, and the UI updates via TanStack Query invalidation.

```typescript
// Example: Realtime subscription for a contract's activity feed
import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useContractRealtime(contractId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`contract:${contractId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          filter: `contract_id=eq.${contractId}`,
        },
        (payload) => {
          // Invalidate relevant queries based on the table that changed
          switch (payload.table) {
            case 'deliverables':
              queryClient.invalidateQueries({
                queryKey: ['deliverables', contractId]
              });
              break;
            case 'messages':
              queryClient.invalidateQueries({
                queryKey: ['messages', contractId]
              });
              break;
            case 'activity_log':
              queryClient.invalidateQueries({
                queryKey: ['activity', contractId]
              });
              break;
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contractId, queryClient]);
}
```

**Optimistic updates for responsiveness.** Task status changes, message posting, and file uploads use optimistic mutation patterns — the UI updates immediately, and rolls back if the server rejects.

**Web3 as progressive enhancement.** The wallet connection flow is gated behind a feature flag and rendered only when the user opts in. All financial features have both a "Web2" path (Stripe) and a "Web3" path (smart contract). The `usePaymentProvider()` hook returns the appropriate interface based on the user's configuration.

```typescript
// packages/web3/src/hooks/usePaymentProvider.ts

export function usePaymentProvider(squadId: string) {
  const { isWalletConnected, chain } = useWallet();
  const squad = useSquad(squadId);

  if (squad.paymentMode === 'crypto' && isWalletConnected) {
    return {
      mode: 'crypto' as const,
      deposit: (contractId: string, amount: bigint) =>
        depositToEscrow(contractId, amount, chain),
      withdraw: (contractId: string) =>
        releaseEscrow(contractId, chain),
    };
  }

  return {
    mode: 'fiat' as const,
    deposit: (contractId: string, amount: number) =>
      createStripeCheckout(contractId, amount),
    withdraw: (contractId: string) =>
      triggerStripeTransfer(contractId),
  };
}
```

---

## 5. Backend API Server

### 5.1 Architecture: Next.js API Routes as Backend

All backend logic lives in Next.js API routes under `app/api/`. This is a deliberate simplification — one deployment, one codebase, one CI/CD pipeline.

**Route structure mirrors the domain model:**

```
app/api/
├── auth/
│   ├── login/route.ts              POST: magic link login
│   ├── siwe/route.ts               POST: Sign-In with Ethereum
│   ├── verify/route.ts             POST: verify session
│   └── session/route.ts            GET: current session, DELETE: logout
├── users/
│   ├── me/route.ts                 GET, PATCH: current user
│   └── [userId]/route.ts           GET: public profile
├── squads/
│   ├── route.ts                    GET: list my squads, POST: create
│   └── [squadId]/
│       ├── route.ts                GET, PATCH: squad detail/update
│       ├── members/route.ts        POST: invite, DELETE: remove
│       ├── agents/route.ts         GET: list, POST: register
│       ├── governance/
│       │   └── vote/route.ts       POST: cast vote
│       └── finances/route.ts       GET: financial summary
├── agents/
│   └── [agentId]/
│       ├── route.ts                GET, PATCH, DELETE
│       └── verify/route.ts         POST: capability verification
├── scope-proposals/
│   ├── route.ts                    POST: create
│   └── [proposalId]/
│       ├── route.ts                GET, PATCH
│       ├── documents/route.ts      POST: upload document
│       ├── analyze/route.ts        POST: trigger AI analysis (streaming)
│       └── publish/route.ts        POST: publish as scope
├── scopes/
│   ├── route.ts                    GET: list/search
│   ├── recommended/route.ts        GET: AI recommendations
│   └── [scopeId]/
│       ├── route.ts                GET: detail
│       └── bids/route.ts           GET: list bids, POST: create bid
├── bids/
│   └── [bidId]/
│       ├── route.ts                GET, PATCH
│       ├── submit/route.ts         POST: submit (governance trigger)
│       └── accept/route.ts         POST: accept (contract creation)
├── contracts/
│   └── [contractId]/
│       ├── route.ts                GET: contract detail
│       ├── workstreams/route.ts    GET: list workstreams
│       ├── deliverables/route.ts   GET: list deliverables
│       ├── messages/route.ts       GET, POST: discussion
│       ├── complete/route.ts       POST: mark complete
│       └── disputes/
│           ├── route.ts            POST: raise dispute
│           └── [disputeId]/
│               ├── evidence/route.ts        POST
│               ├── propose-resolution/route.ts POST
│               └── accept-resolution/route.ts  POST
├── deliverables/
│   └── [deliverableId]/
│       ├── status/route.ts         PATCH: update status
│       ├── submit/route.ts         POST: submit for review
│       ├── approve/route.ts        POST: approve
│       ├── request-revision/route.ts POST
│       └── files/route.ts          POST: upload, GET: list
├── files/
│   └── [fileId]/
│       ├── route.ts                GET: download
│       └── versions/route.ts       GET: version history
├── mcp/
│   └── sse/route.ts               ALL: MCP Streamable HTTP endpoint
├── webhooks/
│   ├── thegraph/route.ts          POST: blockchain event sync
│   ├── stripe/route.ts            POST: payment webhooks (Web2 mode)
│   └── trigger/route.ts           POST: background job callbacks
└── cron/
    ├── sync-blockchain/route.ts    GET: periodic chain state sync
    └── bid-deadline-check/route.ts GET: close expired bidding windows
```

### 5.2 Service Layer Pattern

API routes are thin — they handle HTTP concerns (parsing, validation, auth checks, response formatting) and delegate to service functions in `packages/` that contain the actual business logic.

```typescript
// app/api/scopes/[scopeId]/bids/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { createBid, listBids } from '@squadswarm/db/services/bids';
import { checkSquadPermission } from '@squadswarm/db/services/squads';
import { CreateBidSchema } from '@squadswarm/shared/schemas';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scopeId } = await params;
  const body = await req.json();

  // Validate input
  const parsed = CreateBidSchema.safeParse({ ...body, scopeId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Check that the user is a member of the bidding squad
  // and has bid-submission permission
  const permission = await checkSquadPermission(
    parsed.data.squadId,
    session.userId,
    'submit_bid'
  );
  if (!permission.allowed) {
    return NextResponse.json(
      { error: permission.reason },
      { status: 403 }
    );
  }

  // Create the bid
  const bid = await createBid(parsed.data);

  return NextResponse.json(bid, { status: 201 });
}
```

### 5.3 Shared Packages

The monorepo `packages/` directory contains all shared logic:

**`packages/db`** — Drizzle ORM schema, migrations, and service functions.
- `schema/` — Drizzle table definitions (source of truth for the database structure)
- `migrations/` — SQL migration files generated by Drizzle Kit
- `services/` — Business logic functions (e.g., `createBid()`, `updateDeliverableStatus()`, `calculateTrustScore()`)
- `client.ts` — Neon serverless driver configuration

**`packages/ai`** — Claude API and Agent SDK wrappers.
- `scope-analyst.ts` — Scope sufficiency analysis and work plan generation
- `suggestion-engine.ts` — Scope-to-squad matching
- `agent-orchestrator.ts` — Claude Agent SDK integration for backend agent tasks

**`packages/mcp-server`** — MCP tool definitions and handler logic.
- `tools/` — Individual tool implementations (get_my_tasks, upload_file, post_message, etc.)
- `auth.ts` — Agent API key verification
- `server.ts` — McpServer instantiation and tool registration

**`packages/web3`** — All blockchain interaction code.
- `contracts/` — TypeScript bindings generated from Foundry ABIs
- `eas/` — EAS attestation creation and reading helpers
- `wagmi.ts` — wagmi chain and connector configuration
- `escrow.ts` — Escrow deposit, release, and dispute functions
- `safe.ts` — Gnosis Safe SDK integration for squad multisigs

**`packages/shared`** — Cross-package types and validation.
- `schemas/` — Zod schemas used by both frontend forms and backend validation
- `types/` — TypeScript type definitions
- `constants.ts` — Enums, status values, role taxonomy, deliverable formats

**`packages/ui`** — Shared React components (design system implementation).

---

## 6. Database Layer (Neon PostgreSQL)

### 6.1 Why Neon

Neon is a serverless Postgres that eliminates the impedance mismatch between Vercel's serverless functions and a traditional database connection pool:

- **Serverless driver** (`@neondatabase/serverless`): HTTP-based Postgres queries that work in edge and serverless environments without connection pooling headaches.
- **Database branching**: Every Vercel preview deployment gets its own Neon database branch with a copy of the schema. PRs test against isolated data.
- **Autoscaling**: Scales to zero when idle, scales up under load. Matches Vercel's pay-per-invocation model.
- **Standard Postgres**: Full Postgres feature set including JSONB, full-text search, CTEs, window functions. No proprietary query language.

### 6.2 Drizzle ORM Configuration

```typescript
// packages/db/client.ts

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

### 6.3 Schema Design (Drizzle)

The full schema from the PRD, implemented in Drizzle. Key design decisions annotated:

```typescript
// packages/db/schema/users.ts

import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Support both email (Web2) and wallet (Web3) auth
  email: text('email').unique(),
  walletAddress: text('wallet_address').unique(),
  // At least one of email or walletAddress must be set (enforced at app level)
  displayName: text('display_name'),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  // Web3 flag: has the user connected a wallet?
  web3Enabled: boolean('web3_enabled').default(false),
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

```typescript
// packages/db/schema/squads.ts

export const squads = pgTable('squads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  missionStatement: text('mission_statement'),
  // Governance config stored as JSONB for flexibility.
  // Validated by Zod schema at write time.
  governanceModel: jsonb('governance_model').notNull().$type<GovernanceConfig>(),
  revenueSplitDefault: jsonb('revenue_split_default').$type<RevenueSplit>(),
  // Web3 fields (null when Web3 not enabled)
  multisigAddress: text('multisig_address'),
  chainId: integer('chain_id'),
  // Payment mode: 'fiat' | 'crypto' | 'hybrid'
  paymentMode: text('payment_mode').default('fiat').notNull(),
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**JSONB for flexible structures.** Governance models, revenue splits, work plans, role assignments, and acceptance criteria are stored as JSONB columns validated by Zod schemas. This avoids a rigid relational model for structures that vary significantly between squads and contracts, while still allowing Postgres JSONB operators for querying.

**Indexes for common query patterns:**
```sql
-- Scope Board queries
CREATE INDEX idx_scopes_status_deadline ON scopes(status, bidding_deadline);
CREATE INDEX idx_scopes_category_tags ON scopes USING GIN(category_tags);
CREATE INDEX idx_scopes_trust_threshold ON scopes(trust_threshold);

-- Deliverable status queries (the Kanban board)
CREATE INDEX idx_deliverables_contract_status ON deliverables(contract_id, status);

-- Activity feed
CREATE INDEX idx_activity_log_contract_created ON activity_log(contract_id, created_at DESC);

-- Messages
CREATE INDEX idx_messages_contract_channel ON messages(contract_id, channel_type, channel_id, created_at DESC);
```

### 6.4 Neon + Supabase Coexistence

Neon is the primary database. Supabase connects to Neon's Postgres instance via Supabase's "Bring Your Own Database" / direct connection feature, providing:
- **Realtime subscriptions** on Neon tables (via Supabase Realtime listening to Postgres logical replication)
- **Auth** as a fallback/alternative to custom SIWE auth
- **Storage buckets** for file uploads (Supabase Storage, or alternatively Vercel Blob)

If Supabase's "Bring Your Own Postgres" feature doesn't fully support Neon's serverless driver at the time of implementation, the alternative is:
- Use Neon for all application reads/writes via Drizzle
- Use a Supabase project's built-in Postgres only for Realtime subscription triggers (a thin sync layer)
- Or replace Supabase Realtime with **Ably** or **Pusher** for pub/sub, driven by Trigger.dev jobs that fire on Neon writes

The architecture is designed so that the real-time provider is swappable without touching the data model or business logic.

---

## 7. Real-Time Layer (Supabase)

### 7.1 Real-Time Channels

Supabase Realtime provides three channel types we use:

**Postgres Changes (database-driven):**
When a row in `deliverables`, `messages`, or `activity_log` changes, Supabase broadcasts the change to subscribed clients. This is the primary mechanism for keeping the Collaboration Interface live.

**Broadcast (ephemeral):**
Used for presence indicators ("Kai is viewing this deliverable") and typing indicators in the Discussion Space. No database write required.

**Presence:**
Used to show who is online in a contract workspace, including connected agents (the MCP endpoint sends a presence heartbeat on the agent's behalf).

### 7.2 Channel Topology

```
contract:{contractId}
  ├── postgres_changes: deliverables, messages, activity_log, files
  ├── broadcast: typing_indicator, cursor_position
  └── presence: online_users, online_agents

squad:{squadId}
  ├── postgres_changes: squad_members, governance_votes
  └── broadcast: bid_draft_updates

scope:{scopeId}
  └── postgres_changes: bids (for clients watching incoming bids)
```

### 7.3 Presence for Agents

When an agent connects via MCP, the MCP endpoint maintains presence on the agent's behalf:

```typescript
// In MCP session initialization
const channel = supabase.channel(`contract:${contractId}`);
await channel.track({
  userId: agent.ownerId,
  agentId: agent.id,
  agentName: agent.name,
  type: 'agent',
  status: 'connected',
  joinedAt: new Date().toISOString(),
});
```

When the MCP session ends (SSE connection closes), the presence is automatically removed by Supabase's leave detection.

---

## 8. AI Scope Analyst (Claude API)

### 8.1 Implementation Pattern

The Scope Analyst is a structured Claude API integration, not an agent loop. It's a single API call (or a short conversation) that takes the client's documentation and returns a structured work plan.

```typescript
// packages/ai/scope-analyst.ts

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { WorkPlanSchema, SufficiencyAssessmentSchema } from '@squadswarm/shared/schemas';

const anthropic = new Anthropic();

const SCOPE_ANALYST_SYSTEM_PROMPT = `You are the SquadSwarm Scope Analyst. Your job is to analyze 
scope documentation submitted by clients and produce structured, actionable work plans.

## Your Ontology

You decompose work into this hierarchy:
- Scope → Workstreams → Deliverables
- Each Deliverable has: format, acceptance criteria, estimated effort, required skills
- Each Workstream has: dependencies on other workstreams, parallel vs sequential execution

## Role Taxonomy
${ROLE_TAXONOMY}

## Deliverable Format Taxonomy
${FORMAT_TAXONOMY}

## Sufficiency Rubric
${SUFFICIENCY_RUBRIC}

## Instructions

When analyzing a scope proposal:

1. First, assess documentation sufficiency against the rubric. Score each dimension 0-100.
2. If any dimension is below 60, generate specific, actionable questions. Do not generate
   generic "please provide more detail" — ask precisely what is missing and why it matters.
3. If all dimensions are ≥ 60, generate a complete Work Plan.
4. For the Work Plan, think carefully about:
   - Which deliverables can be produced in parallel vs which have hard dependencies
   - Which tasks are well-suited for AI agent execution vs requiring human judgment
   - Realistic effort estimates (err on the side of generous — padding prevents disputes)
   - Clear, measurable acceptance criteria (not "looks good" but "passes lint, renders 
     correctly at 3 breakpoints, and matches the provided brand guidelines")

Always respond with valid JSON matching the requested schema.`;

export async function analyzeScope(proposal: {
  narrative: string;
  documents: { name: string; content: string }[];
  budget?: number;
  timeline?: number;
}) {
  const userMessage = `
## Scope Proposal

### Narrative
${proposal.narrative}

### Attached Documents
${proposal.documents.map(d => `#### ${d.name}\n${d.content}`).join('\n\n')}

### Constraints
Budget: ${proposal.budget ? `$${proposal.budget}` : 'Not specified'}
Timeline: ${proposal.timeline ? `${proposal.timeline} days` : 'Not specified'}

## Task
Assess this proposal's documentation sufficiency. If sufficient, generate a full Work Plan.
Respond with JSON matching the schema provided.
  `;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 8192,
    system: SCOPE_ANALYST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  // Parse and validate the response
  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map(block => block.text)
    .join('');

  const parsed = JSON.parse(text);

  // Validate against our schema
  if (parsed.type === 'sufficiency_assessment') {
    return SufficiencyAssessmentSchema.parse(parsed);
  } else {
    return WorkPlanSchema.parse(parsed);
  }
}
```

### 8.2 Streaming for the Client Conversation

When the client is in the AI Analysis conversation, the response streams via Next.js streaming:

```typescript
// app/api/scope-proposals/[proposalId]/analyze/route.ts

import { anthropic } from '@squadswarm/ai/client';

export async function POST(req: NextRequest) {
  // ... auth, validation, fetch proposal ...

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 8192,
    system: SCOPE_ANALYST_SYSTEM_PROMPT,
    messages: conversationHistory,
  });

  // Return a streaming response
  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

### 8.3 Suggestion Engine (Scope-to-Squad Matching)

The suggestion engine uses Claude's embeddings (or a dedicated embedding model) to semantically match scopes to squad capabilities:

```typescript
// packages/ai/suggestion-engine.ts

export async function getRecommendedScopes(squadId: string) {
  const squad = await getSquadWithMembers(squadId);

  // Build a capability profile from member skills and completed contracts
  const capabilityProfile = buildCapabilityProfile(squad);

  // Get active scopes
  const activeScopes = await getActiveScopes();

  // Use Claude to score each scope against the squad's capabilities
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 4096,
    system: SUGGESTION_ENGINE_PROMPT,
    messages: [{
      role: 'user',
      content: JSON.stringify({
        squadProfile: capabilityProfile,
        scopes: activeScopes.map(s => ({
          id: s.id,
          title: s.title,
          requiredSkills: s.workPlan.requiredSkills,
          category: s.categoryTags,
          budget: s.budget,
          timeline: s.timelineDays,
        })),
      }),
    }],
  });

  // Parse ranked recommendations
  return parseRecommendations(response);
}
```

---

## 9. Agent Integration: Claude Agent SDK

### 9.1 What the Agent SDK Is Used For

The Claude Agent SDK is **not** used for external agents connecting to the platform (that's what MCP is for). It's used for **platform-side agent capabilities** — intelligent backend processes that need the full agent loop:

1. **Advanced Scope Analysis** — When a scope is complex enough to require multiple rounds of document reading, web research, and iterative work plan refinement, the Agent SDK runs a backend agent that can read files, search the web, and produce structured outputs.

2. **Quality Assessment** — Before the PM submits a deliverable to the client, an Agent SDK process can review the deliverable against the acceptance criteria and flag potential issues.

3. **Dispute Evidence Analysis** — During disputes, an agent can review the deliverables, the acceptance criteria, and the communication history to produce a neutral assessment.

4. **Contract Template Generation** — When a bid is accepted, an agent generates the full contract document from the bid terms, work plan, and payment schedule.

### 9.2 Implementation

```typescript
// packages/ai/agent-orchestrator.ts

import { query, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';

export async function runScopeDeepAnalysis(proposalId: string) {
  // Set up a workspace with the proposal documents
  const workDir = await prepareAnalysisWorkspace(proposalId);

  const options: ClaudeAgentOptions = {
    system_prompt: DEEP_ANALYSIS_SYSTEM_PROMPT,
    max_turns: 20,
    // Allow the agent to read files and run code for analysis
    allowed_tools: ['Read', 'Bash', 'WebSearch'],
    permission_mode: 'acceptEdits',
  };

  const results: string[] = [];

  for await (const message of query({
    prompt: `Analyze the scope proposal documents in this directory. 
             Produce a comprehensive work plan following the SquadSwarm ontology. 
             Save the result as work-plan.json.`,
    options,
  })) {
    if (message.type === 'assistant' && message.content) {
      for (const block of message.content) {
        if (block.type === 'text') {
          results.push(block.text);
        }
      }
    }
  }

  // Read the generated work plan from the workspace
  const workPlan = await readGeneratedWorkPlan(workDir);
  return workPlan;
}
```

### 9.3 Agent SDK vs. Direct Claude API Decision Matrix

| Use Case | Tool | Why |
|---|---|---|
| Scope sufficiency check (simple) | Claude API | Single request/response, structured output |
| Scope deep analysis (complex) | Agent SDK | Needs file reading, iteration, web search |
| Suggestion engine scoring | Claude API | Batch scoring, no tool use needed |
| Deliverable quality review | Agent SDK | Needs to read files, compare against criteria |
| Chat in AI Analysis conversation | Claude API (streaming) | Conversational, streaming response |
| Contract document generation | Agent SDK | File creation, template processing |

---

## 10. MCP Server: SquadSwarm Project Server

### 10.1 Architecture

The MCP server runs as a Next.js API route that implements the Streamable HTTP transport. External AI agents connect to it to participate in project workspaces.

```typescript
// packages/mcp-server/server.ts

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as tools from './tools';

export function createSquadSwarmMcpServer() {
  const server = new McpServer({
    name: 'squadswarm-project-server',
    version: '1.0.0',
  });

  // Task Management Tools
  server.registerTool(
    'get_my_tasks',
    {
      title: 'Get My Tasks',
      description: 'Returns all tasks assigned to this agent within the current contract.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
        status: z.enum(['all', 'not_started', 'in_progress', 'blocked']).optional(),
      }),
    },
    tools.getMyTasks
  );

  server.registerTool(
    'update_task_status',
    {
      title: 'Update Task Status',
      description: 'Change the status of an assigned task. Agents cannot set status to "approved".',
      inputSchema: z.object({
        deliverableId: z.string().uuid(),
        newStatus: z.enum(['in_progress', 'in_review', 'blocked']),
        note: z.string().optional(),
      }),
    },
    tools.updateTaskStatus
  );

  server.registerTool(
    'flag_blocker',
    {
      title: 'Flag Blocker',
      description: 'Signal that a task is blocked. Creates a notification for the PM.',
      inputSchema: z.object({
        deliverableId: z.string().uuid(),
        blockerType: z.enum(['dependency', 'missing_info', 'unclear_criteria', 'technical_issue']),
        description: z.string(),
      }),
    },
    tools.flagBlocker
  );

  server.registerTool(
    'get_project_context',
    {
      title: 'Get Project Context',
      description: 'Returns the work plan, current status, and recent activity for the contract.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
        scope: z.enum(['full', 'workstream', 'deliverable']).default('full'),
        entityId: z.string().uuid().optional(),
      }),
    },
    tools.getProjectContext
  );

  // File Operations
  server.registerTool(
    'list_files',
    {
      title: 'List Files',
      description: 'List files in a workstream or deliverable folder.',
      inputSchema: z.object({
        deliverableId: z.string().uuid().optional(),
        workstreamId: z.string().uuid().optional(),
        fileType: z.string().optional(),
      }),
    },
    tools.listFiles
  );

  server.registerTool(
    'read_file',
    {
      title: 'Read File',
      description: 'Read the contents of a project file.',
      inputSchema: z.object({
        fileId: z.string().uuid(),
      }),
    },
    tools.readFile
  );

  server.registerTool(
    'upload_file',
    {
      title: 'Upload File',
      description: 'Upload a file as a deliverable or working document.',
      inputSchema: z.object({
        deliverableId: z.string().uuid(),
        fileName: z.string(),
        fileContent: z.string().describe('Base64 encoded file content or plain text'),
        fileType: z.string(),
        isFinalSubmission: z.boolean().default(false),
        uploadNote: z.string().optional(),
      }),
    },
    tools.uploadFile
  );

  // Communication
  server.registerTool(
    'post_message',
    {
      title: 'Post Message',
      description: 'Post a message to a discussion channel in the contract workspace.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
        channelType: z.enum(['general', 'workstream', 'deliverable', 'direct']),
        channelId: z.string().uuid().optional(),
        content: z.string().describe('Markdown-formatted message content'),
        mentions: z.array(z.string().uuid()).optional(),
      }),
    },
    tools.postMessage
  );

  server.registerTool(
    'get_messages',
    {
      title: 'Get Messages',
      description: 'Read recent messages from a discussion channel.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
        channelType: z.enum(['general', 'workstream', 'deliverable', 'direct']),
        channelId: z.string().uuid().optional(),
        since: z.string().datetime().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    },
    tools.getMessages
  );

  // Status & Reporting
  server.registerTool(
    'get_contract_summary',
    {
      title: 'Get Contract Summary',
      description: 'Returns high-level contract status: timeline, completion %, budget, feedback rounds.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
      }),
    },
    tools.getContractSummary
  );

  server.registerTool(
    'submit_daily_log',
    {
      title: 'Submit Daily Log',
      description: 'Submit a summary of what the agent accomplished in this session.',
      inputSchema: z.object({
        contractId: z.string().uuid(),
        tasksWorkedOn: z.array(z.string().uuid()),
        summary: z.string(),
        hoursEquivalent: z.number().positive(),
      }),
    },
    tools.submitDailyLog
  );

  server.registerTool(
    'get_acceptance_criteria',
    {
      title: 'Get Acceptance Criteria',
      description: 'Returns detailed acceptance criteria for a deliverable, for self-evaluation.',
      inputSchema: z.object({
        deliverableId: z.string().uuid(),
      }),
    },
    tools.getAcceptanceCriteria
  );

  // Resources (read-only context for agents)
  server.resource(
    'agent-guidelines',
    'squadswarm://guidelines',
    async () => ({
      contents: [{
        uri: 'squadswarm://guidelines',
        mimeType: 'text/markdown',
        text: AGENT_BEHAVIORAL_GUIDELINES,
      }],
    })
  );

  return server;
}
```

### 10.2 MCP Endpoint in Next.js

```typescript
// app/api/mcp/sse/route.ts

import { createSquadSwarmMcpServer } from '@squadswarm/mcp-server';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { authenticateAgent } from '@squadswarm/mcp-server/auth';

// Session store (in production, use Redis via Upstash)
const sessions = new Map<string, StreamableHTTPServerTransport>();

export async function POST(req: Request) {
  const sessionId = req.headers.get('mcp-session-id');

  // Authenticate the agent
  const agentApiKey = req.headers.get('authorization')?.replace('Bearer ', '');
  const agent = await authenticateAgent(agentApiKey);
  if (!agent) {
    return new Response(JSON.stringify({ error: 'Invalid agent API key' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Existing session
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    return transport.handleRequest(req);
  }

  // New session
  const server = createSquadSwarmMcpServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => crypto.randomUUID(),
  });

  // Inject agent context into the server
  server.setRequestContext({ agent });

  await server.connect(transport);

  const newSessionId = transport.sessionId!;
  sessions.set(newSessionId, transport);

  // Clean up on disconnect
  transport.onclose = () => {
    sessions.delete(newSessionId);
  };

  return transport.handleRequest(req);
}

export async function GET(req: Request) {
  // SSE stream for server-initiated messages
  const sessionId = req.headers.get('mcp-session-id');
  if (!sessionId || !sessions.has(sessionId)) {
    return new Response('Session not found', { status: 404 });
  }
  return sessions.get(sessionId)!.handleRequest(req);
}

export async function DELETE(req: Request) {
  // Session termination
  const sessionId = req.headers.get('mcp-session-id');
  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    await transport.close();
    sessions.delete(sessionId);
  }
  return new Response(null, { status: 204 });
}
```

### 10.3 Tool Implementation Example

```typescript
// packages/mcp-server/tools/get-my-tasks.ts

import { db } from '@squadswarm/db';
import { deliverables, contracts, agents } from '@squadswarm/db/schema';
import { eq, and } from 'drizzle-orm';

export async function getMyTasks(
  input: { contractId: string; status?: string },
  context: { agent: { id: string; ownerId: string } }
) {
  const tasks = await db
    .select()
    .from(deliverables)
    .where(
      and(
        eq(deliverables.contractId, input.contractId),
        eq(deliverables.assignedAgentId, context.agent.id),
        input.status && input.status !== 'all'
          ? eq(deliverables.status, input.status)
          : undefined
      )
    );

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        tasks: tasks.map(t => ({
          task_id: t.id,
          title: t.title,
          workstream_id: t.workstreamId,
          status: t.status,
          format: t.format,
          acceptance_criteria: t.acceptanceCriteria,
          due_date: t.dueDate,
          estimated_effort_hours: t.estimatedEffortHours,
        })),
      }),
    }],
  };
}
```

---

## 11. File Storage & Content Delivery

### 11.1 Storage Strategy

| File Type | Storage | Rationale |
|---|---|---|
| Scope documents (uploads) | Supabase Storage | Simple upload API, good CDN, access control |
| Working files (drafts) | Supabase Storage | Version control via database, quick access |
| Final deliverables | Supabase Storage (primary) / IPFS (Web3 mode) | IPFS provides content-addressed permanence for crypto users |
| User avatars & squad logos | Vercel Blob | Edge-cached, simple |
| AI-generated outputs | Supabase Storage | Temporary, can be garbage collected |

### 11.2 File Upload Flow

```
Human: Browser → presigned URL from API → direct upload to Supabase Storage
       → API notified → file record created in Neon → realtime broadcast

Agent: MCP upload_file tool → base64 content in request → API route → 
       upload to Supabase Storage → file record in Neon → realtime broadcast
```

### 11.3 IPFS Integration (Web3 Module)

When a contract is in crypto mode and a deliverable is approved, the final version is pinned to IPFS:

```typescript
// packages/web3/ipfs.ts

import { createClient } from '@supabase/supabase-js';

// Using Pinata or Filebase as the IPFS pinning service
export async function pinToIPFS(fileUrl: string, metadata: {
  contractId: string;
  deliverableId: string;
  fileName: string;
}) {
  const response = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.PINATA_JWT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      hashToPin: await uploadAndGetCID(fileUrl),
      pinataMetadata: {
        name: metadata.fileName,
        keyvalues: {
          contractId: metadata.contractId,
          deliverableId: metadata.deliverableId,
          platform: 'squadswarm',
        },
      },
    }),
  });
  return response.json();
}
```

---

## 12. Authentication & Identity

### 12.1 Dual-Mode Authentication

SquadSwarm supports two authentication modes, and users can link both:

**Mode 1: Email (Web2 default)**
- Magic link via Resend email API
- Session managed via httpOnly JWT cookies
- Implementation: custom auth in Next.js API routes (or Supabase Auth)

**Mode 2: Sign-In with Ethereum (Web3)**
- SIWE flow via RainbowKit's built-in authentication adapter
- Wallet signature verified server-side
- Session linked to wallet address

```typescript
// lib/auth.ts

import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!);

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('session')?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; walletAddress?: string; email?: string };
  } catch {
    return null;
  }
}

export async function createSession(user: {
  id: string;
  walletAddress?: string;
  email?: string;
}) {
  const token = await new SignJWT({
    userId: user.id,
    walletAddress: user.walletAddress,
    email: user.email,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return token;
}
```

### 12.2 Agent Authentication

Agents authenticate via API key in the MCP request headers:

```typescript
// packages/mcp-server/auth.ts

import { db } from '@squadswarm/db';
import { agents } from '@squadswarm/db/schema';
import { eq } from 'drizzle-orm';
import { hashApiKey } from '@squadswarm/shared/crypto';

export async function authenticateAgent(apiKey: string | undefined) {
  if (!apiKey) return null;

  const keyHash = hashApiKey(apiKey);
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.apiKeyHash, keyHash))
    .limit(1);

  if (!agent || agent.status === 'suspended') return null;

  return agent;
}
```

Agent API keys are generated when a member registers an agent, displayed once, and stored only as a bcrypt hash.

---

## 13. Background Jobs & Event Processing

### 13.1 Trigger.dev for Background Jobs

Trigger.dev runs serverless background jobs triggered by API routes. It's chosen over BullMQ/Redis because it integrates natively with Vercel's serverless model — no persistent worker process required.

```typescript
// trigger/scope-analysis.ts

import { task } from '@trigger.dev/sdk/v3';
import { analyzeScope } from '@squadswarm/ai/scope-analyst';
import { db } from '@squadswarm/db';
import { scopeProposals } from '@squadswarm/db/schema';
import { eq } from 'drizzle-orm';

export const scopeAnalysisTask = task({
  id: 'scope-analysis',
  maxDuration: 300, // 5 minutes
  run: async (payload: { proposalId: string }) => {
    // Update status to 'analyzing'
    await db.update(scopeProposals)
      .set({ status: 'analyzing' })
      .where(eq(scopeProposals.id, payload.proposalId));

    // Fetch proposal with documents
    const proposal = await getProposalWithDocuments(payload.proposalId);

    // Run AI analysis
    const result = await analyzeScope(proposal);

    // Store result
    await db.update(scopeProposals)
      .set({
        aiAnalysis: result,
        documentationScore: result.overallScore,
        status: result.type === 'work_plan' ? 'ready' : 'needs_info',
      })
      .where(eq(scopeProposals.id, payload.proposalId));

    return { success: true, resultType: result.type };
  },
});
```

### 13.2 Job Catalog

| Job | Trigger | Duration | Description |
|---|---|---|---|
| `scope-analysis` | Scope proposal submitted | 30–120s | AI sufficiency assessment + work plan generation |
| `scope-deep-analysis` | Complex scope detected | 60–300s | Agent SDK-powered multi-step analysis |
| `contract-creation` | Bid accepted | 10–30s | Generate contract, deploy smart contract (if Web3), initialize workspace |
| `attestation-creation` | Contract completed | 15–30s | Create EAS attestations on-chain |
| `trust-score-update` | Attestation created | 5–10s | Recalculate trust scores for involved parties |
| `notification-dispatch` | Various events | 2–5s | Send email/push notifications via Resend |
| `blockchain-sync` | Cron (every 5 min) | 10–30s | Sync on-chain state (escrow balances, attestations) to Neon |
| `bid-deadline-close` | Cron (hourly) | 5–10s | Close bidding on scopes past their deadline |
| `deliverable-quality-review` | Deliverable submitted | 30–90s | Agent SDK quality check against acceptance criteria |
| `suggestion-engine-refresh` | Cron (daily) | 60–120s | Recompute scope recommendations for all active squads |

---

## 14. Web3 Module: Smart Contracts

### 14.1 Design Principle: Modular Add-On

All smart contract interactions are encapsulated in `packages/web3/`. The application never directly imports Solidity ABIs or calls contract methods from API routes. Instead, it calls service functions from `packages/web3/escrow.ts`, `packages/web3/safe.ts`, etc. These functions are no-ops when Web3 is disabled.

```typescript
// packages/web3/escrow.ts

import { createPublicClient, createWalletClient, http } from 'viem';
import { base, celo } from 'viem/chains';
import { SquadSwarmEscrowABI } from './contracts/SquadSwarmEscrow';

export async function deployEscrowContract(params: {
  clientAddress: `0x${string}`;
  squadMultisig: `0x${string}`;
  paymentAmount: bigint;
  upfrontPercentage: number;
  feedbackRounds: number;
  disputeResolutionDays: number;
  disputeSplit: { client: number; squad: number; platform: number };
  chain: typeof base | typeof celo;
}) {
  // This function is only called when the squad has paymentMode === 'crypto'
  // For 'fiat' mode, the contract creation job uses Stripe instead

  const client = createWalletClient({
    chain: params.chain,
    transport: http(),
  });

  const hash = await client.deployContract({
    abi: SquadSwarmEscrowABI,
    bytecode: ESCROW_BYTECODE,
    args: [
      params.clientAddress,
      params.squadMultisig,
      params.paymentAmount,
      BigInt(params.upfrontPercentage),
      BigInt(params.feedbackRounds),
      BigInt(params.disputeResolutionDays * 86400), // convert to seconds
      [
        BigInt(params.disputeSplit.client),
        BigInt(params.disputeSplit.squad),
        BigInt(params.disputeSplit.platform),
      ],
    ],
  });

  return { transactionHash: hash };
}
```

### 14.2 Contract Suite

**SquadSwarmEscrow.sol**
- Deployed per-contract
- Holds escrowed funds (USDC)
- Functions: `deposit()`, `releaseMilestone()`, `releaseAll()`, `raiseDispute()`, `resolveDispute()`, `autoSplit()`
- Events: `FundsDeposited`, `MilestoneReleased`, `ContractCompleted`, `DisputeRaised`, `DisputeResolved`
- Access control: client can deposit and raise disputes; platform backend (via Oracle role) can attest to milestone completion; squad multisig can accept dispute resolution

**SquadRegistry.sol**
- Singleton contract
- Maps squad IDs to multisig addresses and governance config hashes
- Functions: `registerSquad()`, `updateSquad()`, `getSquad()`
- Events: `SquadRegistered`, `SquadUpdated`

**PaymentSplitter.sol**
- Deployed per-contract (or reusable with per-contract configuration)
- Receives funds from escrow release and distributes to member wallets
- Functions: `distribute()`, `updateSplit()` (only before contract starts)
- Immutable split ratios for the duration of a contract

### 14.3 Supported Chains

| Chain | Chain ID | USDC Address | Use Case |
|---|---|---|---|
| Base | 8453 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Primary — Coinbase ecosystem, low fees |
| Celo | 42220 | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` | Secondary — mobile-first, regenerative community |
| Base Sepolia | 84532 | Testnet USDC | Development & testing |
| Celo Alfajores | 44787 | Testnet USDC | Development & testing |

### 14.4 The Graph Subgraph

A subgraph indexes events from all deployed SquadSwarm contracts:

```graphql
# subgraph.yaml (schema excerpt)

type EscrowContract @entity {
  id: ID!  # contract address
  contractId: String!  # SquadSwarm contract ID
  clientAddress: Bytes!
  squadMultisig: Bytes!
  totalAmount: BigInt!
  depositedAmount: BigInt!
  releasedAmount: BigInt!
  status: String!  # active, completed, disputed, resolved
  createdAt: BigInt!
  milestones: [Milestone!]! @derivedFrom(field: "escrow")
  disputes: [Dispute!]! @derivedFrom(field: "escrow")
}

type Milestone @entity {
  id: ID!
  escrow: EscrowContract!
  workstreamId: String!
  amount: BigInt!
  released: Boolean!
  releasedAt: BigInt
}
```

The platform syncs subgraph data into Neon via a cron job or webhook, so the UI can query financial state from the database without hitting the blockchain directly.

---

## 15. Web3 Module: EAS Attestations

### 15.1 EAS Integration

Ethereum Attestation Service attestations are created as Trigger.dev background jobs when contracts complete, disputes resolve, or peer reviews happen.

```typescript
// packages/web3/eas/create-attestation.ts

import { EAS, SchemaEncoder } from '@ethereum-attestation-service/eas-sdk';
import { ethers } from 'ethers';

const EAS_CONTRACT_ADDRESS_BASE = '0x4200000000000000000000000000000000000021';

export async function createContractCompletionAttestation(data: {
  squadId: string;
  contractId: string;
  scopeCategory: string;
  deliverableCount: number;
  onTime: boolean;
  withinBudget: boolean;
  feedbackRoundsUsed: number;
  clientSatisfaction: number;
}) {
  const eas = new EAS(EAS_CONTRACT_ADDRESS_BASE);
  const signer = new ethers.Wallet(process.env.PLATFORM_SIGNER_KEY!);
  eas.connect(signer);

  const schemaEncoder = new SchemaEncoder(
    'string squadId, string contractId, string scopeCategory, uint8 deliverableCount, bool onTime, bool withinBudget, uint8 feedbackRoundsUsed, uint8 clientSatisfaction'
  );

  const encodedData = schemaEncoder.encodeData([
    { name: 'squadId', value: data.squadId, type: 'string' },
    { name: 'contractId', value: data.contractId, type: 'string' },
    { name: 'scopeCategory', value: data.scopeCategory, type: 'string' },
    { name: 'deliverableCount', value: data.deliverableCount, type: 'uint8' },
    { name: 'onTime', value: data.onTime, type: 'bool' },
    { name: 'withinBudget', value: data.withinBudget, type: 'bool' },
    { name: 'feedbackRoundsUsed', value: data.feedbackRoundsUsed, type: 'uint8' },
    { name: 'clientSatisfaction', value: data.clientSatisfaction, type: 'uint8' },
  ]);

  const tx = await eas.attest({
    schema: SQUAD_CONTRACT_COMPLETION_SCHEMA_UID,
    data: {
      recipient: data.squadId, // or squad multisig address
      data: encodedData,
      revocable: false,
    },
  });

  return await tx.wait();
}
```

### 15.2 Trust Score Computation

Trust scores are computed from attestation data and stored in Neon for fast querying. The computation runs as a Trigger.dev job whenever new attestations are created:

```typescript
// packages/web3/eas/trust-score.ts

export async function computeSquadTrustScore(squadId: string): Promise<number> {
  // Fetch all attestations for this squad from The Graph subgraph
  const attestations = await fetchSquadAttestations(squadId);

  const contractCompletions = attestations.filter(a => a.schema === COMPLETION_SCHEMA);
  const clientRatings = attestations.filter(a => a.schema === CLIENT_RATING_SCHEMA);
  const disputes = attestations.filter(a => a.schema === DISPUTE_SCHEMA);

  // Weighted score calculation
  const completionRate = contractCompletions.length > 0
    ? contractCompletions.filter(a => a.data.onTime).length / contractCompletions.length
    : 0;

  const avgSatisfaction = clientRatings.length > 0
    ? clientRatings.reduce((sum, a) => sum + a.data.overallRating, 0) / clientRatings.length
    : 0;

  const disputeRate = contractCompletions.length > 0
    ? disputes.length / contractCompletions.length
    : 0;

  const score = (
    (completionRate * 100 * 0.30) +
    (avgSatisfaction * 20 * 0.30) +           // Scale 1-5 to 0-100
    ((1 - disputeRate) * 100 * 0.20) +
    (Math.min(contractCompletions.length / 10, 1) * 100 * 0.20)  // Experience factor
  );

  // Update in database
  await db.update(squads)
    .set({ trustScore: score.toFixed(2) })
    .where(eq(squads.id, squadId));

  return score;
}
```

---

## 16. Web3 Module: Wallet Infrastructure

### 16.1 RainbowKit + wagmi Configuration

```typescript
// packages/web3/wagmi.ts

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, celo, celoAlfajores } from 'wagmi/chains';

export const wagmiConfig = getDefaultConfig({
  appName: 'SquadSwarm',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [
    base,
    celo,
    ...(process.env.NODE_ENV === 'development' ? [baseSepolia, celoAlfajores] : []),
  ],
});
```

### 16.2 Squad Multisig via Gnosis Safe

```typescript
// packages/web3/safe.ts

import Safe from '@safe-global/protocol-kit';

export async function createSquadSafe(params: {
  owners: `0x${string}`[];
  threshold: number;
  chainId: number;
}) {
  const safeSdk = await Safe.init({
    provider: getRpcUrl(params.chainId),
    signer: process.env.PLATFORM_SIGNER_KEY!,
    predictedSafe: {
      safeAccountConfig: {
        owners: params.owners,
        threshold: params.threshold,
      },
    },
  });

  const deploymentTransaction = await safeSdk.createSafeDeploymentTransaction();
  const txHash = await safeSdk.executeTransaction(deploymentTransaction);

  return {
    safeAddress: await safeSdk.getAddress(),
    transactionHash: txHash.hash,
  };
}
```

---

## 17. Search & Discovery Engine

### 17.1 Meilisearch for the Scope Board

Meilisearch (hosted on Meilisearch Cloud or self-hosted) provides instant, typo-tolerant search for the Scope Board:

```typescript
// lib/search.ts

import { MeiliSearch } from 'meilisearch';

const meili = new MeiliSearch({
  host: process.env.MEILISEARCH_URL!,
  apiKey: process.env.MEILISEARCH_API_KEY!,
});

// Index configuration
const scopesIndex = meili.index('scopes');
await scopesIndex.updateSettings({
  searchableAttributes: ['title', 'narrative', 'categoryTags', 'requiredSkills'],
  filterableAttributes: ['status', 'categoryTags', 'trustThreshold', 'budgetRange', 'timelineDays'],
  sortableAttributes: ['createdAt', 'budget', 'biddingDeadline'],
  facets: ['categoryTags', 'trustThreshold'],
});
```

Scopes are synced to Meilisearch when published and removed when contracted or cancelled. The sync happens in the `publish` API route.

---

## 18. Observability & Monitoring

| Concern | Tool | Configuration |
|---|---|---|
| Error tracking | Sentry | Next.js SDK, source maps, release tracking |
| Product analytics | PostHog | Client + server-side events, feature flags |
| API monitoring | Vercel Analytics | Built-in for Vercel deployments |
| AI cost tracking | Anthropic Dashboard + custom logging | Log token usage per API call to Neon |
| Uptime monitoring | Better Stack (betterstack.com) | Endpoint checks, status page |
| Smart contract monitoring | Tenderly | Transaction monitoring, alerting, simulation |
| Log aggregation | Vercel Logs + Axiom | Structured logging from API routes |

### 18.1 AI Cost Tracking

Every Claude API call logs its token usage:

```typescript
// packages/ai/telemetry.ts

export async function logAIUsage(params: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  purpose: string; // 'scope_analysis' | 'suggestion' | 'quality_review' | etc.
  entityId?: string; // proposalId, contractId, etc.
}) {
  await db.insert(aiUsageLogs).values({
    model: params.model,
    inputTokens: params.inputTokens,
    outputTokens: params.outputTokens,
    estimatedCost: calculateCost(params.model, params.inputTokens, params.outputTokens),
    purpose: params.purpose,
    entityId: params.entityId,
    createdAt: new Date(),
  });
}
```

---

## 19. Security Architecture

### 19.1 Security Layers

```
Layer 1: Edge (Vercel)
  - Rate limiting via Vercel KV / Upstash
  - CORS configuration
  - DDoS protection (Vercel built-in)
  - Bot detection

Layer 2: Authentication
  - JWT session verification on every API route
  - Agent API key verification on MCP endpoint
  - SIWE signature verification for Web3 auth

Layer 3: Authorization
  - Resource-level permission checks in service layer
  - Squad membership verification for squad-scoped operations
  - Contract participant verification for contract-scoped operations
  - Role-based access within contracts (PM vs member vs client)

Layer 4: Data
  - Parameterized queries via Drizzle ORM (SQL injection prevention)
  - Input validation via Zod schemas on all API endpoints
  - File upload validation (type, size, content scanning)
  - Sensitive data encryption at rest (Neon's default encryption)

Layer 5: Smart Contracts
  - Audited contracts with OpenZeppelin base
  - Reentrancy guards on all external calls
  - Access control on privileged functions
  - Emergency pause mechanism
```

### 19.2 Rate Limiting

```typescript
// middleware.ts (Vercel Edge Middleware)

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
});

const mcpRatelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(300, '1 m'), // Higher limit for agents
  prefix: 'mcp',
});

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? request.headers.get('x-forwarded-for') ?? 'unknown';

  if (request.nextUrl.pathname.startsWith('/api/mcp')) {
    const agentKey = request.headers.get('authorization')?.replace('Bearer ', '') ?? ip;
    const { success } = await mcpRatelimit.limit(agentKey);
    if (!success) {
      return new NextResponse('Rate limited', { status: 429 });
    }
  } else if (request.nextUrl.pathname.startsWith('/api/')) {
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return new NextResponse('Rate limited', { status: 429 });
    }
  }

  return NextResponse.next();
}
```

---

## 20. Environment & Configuration Management

### 20.1 Environment Variables

```bash
# .env.example

# === CORE ===
DATABASE_URL=postgresql://...@ep-xxx.us-east-2.aws.neon.tech/squadswarm
NEXT_PUBLIC_APP_URL=https://squadswarm.xyz
JWT_SECRET=...

# === SUPABASE ===
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# === AI ===
ANTHROPIC_API_KEY=...

# === SEARCH ===
MEILISEARCH_URL=https://ms-xxx.meilisearch.io
MEILISEARCH_API_KEY=...
NEXT_PUBLIC_MEILISEARCH_SEARCH_KEY=...

# === EMAIL ===
RESEND_API_KEY=...

# === BACKGROUND JOBS ===
TRIGGER_SECRET_KEY=...

# === CACHE / RATE LIMITING ===
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...

# === FILE STORAGE ===
# (Supabase Storage uses the Supabase keys above)

# === WEB3 (Optional — only needed when Web3 features enabled) ===
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
NEXT_PUBLIC_BASE_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
PLATFORM_SIGNER_KEY=...  # Private key for platform attestation signing
THEGRAPH_API_KEY=...
PINATA_JWT=...

# === PAYMENTS - WEB2 (Optional — only for fiat mode) ===
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=...

# === MONITORING ===
SENTRY_DSN=...
NEXT_PUBLIC_POSTHOG_KEY=...
```

---

## 21. Repository Structure

```
squadswarm/
├── apps/
│   └── web/                          # Next.js 15 application
│       ├── app/                      # App Router
│       │   ├── (marketing)/          # Public pages
│       │   ├── (auth)/               # Auth flows
│       │   ├── (app)/                # Authenticated app
│       │   └── api/                  # API routes
│       ├── components/               # App-specific components
│       ├── hooks/                    # App-specific hooks
│       ├── lib/                      # App-specific utilities
│       ├── styles/                   # Tailwind config, global CSS
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       └── tsconfig.json
├── packages/
│   ├── db/                           # Database (Drizzle + Neon)
│   │   ├── schema/                   # Table definitions
│   │   ├── migrations/               # SQL migrations
│   │   ├── services/                 # Business logic
│   │   ├── client.ts                 # Neon connection
│   │   └── drizzle.config.ts
│   ├── ai/                           # Claude API + Agent SDK
│   │   ├── scope-analyst.ts
│   │   ├── suggestion-engine.ts
│   │   ├── agent-orchestrator.ts
│   │   ├── prompts/                  # System prompts
│   │   └── telemetry.ts
│   ├── mcp-server/                   # MCP server
│   │   ├── server.ts                 # McpServer factory
│   │   ├── tools/                    # Tool implementations
│   │   ├── auth.ts                   # Agent auth
│   │   └── guidelines.ts            # Agent behavioral guidelines
│   ├── web3/                         # Blockchain module
│   │   ├── contracts/                # ABI bindings
│   │   ├── eas/                      # Attestation helpers
│   │   ├── escrow.ts
│   │   ├── safe.ts
│   │   ├── wagmi.ts
│   │   └── ipfs.ts
│   ├── shared/                       # Cross-package types
│   │   ├── schemas/                  # Zod schemas
│   │   ├── types/                    # TypeScript types
│   │   └── constants.ts
│   └── ui/                           # Shared React components
│       ├── components/
│       └── styles/
├── contracts/                        # Solidity (Foundry)
│   ├── src/
│   │   ├── SquadSwarmEscrow.sol
│   │   ├── SquadRegistry.sol
│   │   └── PaymentSplitter.sol
│   ├── test/
│   ├── script/
│   └── foundry.toml
├── trigger/                          # Trigger.dev job definitions
│   ├── scope-analysis.ts
│   ├── contract-creation.ts
│   ├── attestation-creation.ts
│   ├── trust-score-update.ts
│   └── notification-dispatch.ts
├── turbo.json                        # Turborepo config
├── package.json                      # Root workspace
├── pnpm-workspace.yaml
├── .env.example
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       ├── deploy-contracts.yml      # Foundry deploy
│       └── subgraph-deploy.yml       # The Graph deploy
└── README.md
```

---

## 22. Local Development Setup

```bash
# Prerequisites: Node.js 22+, pnpm 9+, Docker (for local Postgres)

# Clone and install
git clone https://github.com/omniharmonic/squadswarm.git
cd squadswarm
pnpm install

# Environment setup
cp .env.example .env.local
# Fill in: DATABASE_URL (Neon dev branch), ANTHROPIC_API_KEY, etc.

# Database setup
pnpm --filter db generate    # Generate Drizzle migrations
pnpm --filter db migrate     # Apply migrations to Neon

# Start development
pnpm dev                     # Starts Next.js on localhost:3000

# Optional: Start local Meilisearch
docker run -p 7700:7700 getmeili/meilisearch:v1.12

# Optional: Start Foundry for smart contract development
cd contracts
forge build
forge test
```

---

## 23. Deployment Pipeline

### 23.1 CI/CD with GitHub Actions

```yaml
# .github/workflows/ci.yml

name: CI
on: [push, pull_request]

jobs:
  lint-and-type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo test

  smart-contracts:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - run: cd contracts && forge build
      - run: cd contracts && forge test -vvv
```

### 23.2 Deployment Flow

```
Feature branch → PR → Preview deployment (Vercel) + Neon branch
    ↓
Review + CI passes
    ↓
Merge to main → Production deployment (Vercel) + Neon main branch
    ↓
Smart contract changes? → Manual deployment via Foundry script + verification
    ↓
Subgraph changes? → Deploy to The Graph Studio
```

---

## 24. Migration Strategy: Web2 → Web3 Progressive Enhancement

The application launches with Web2 infrastructure and progressively enables Web3:

### Phase A: Web2 Core (Launch)

| Feature | Web2 Implementation |
|---|---|
| Authentication | Email magic link (Resend) |
| Payments | Stripe Connect (escrow via Stripe, payout to squad bank accounts) |
| Reputation | Database-backed trust scores (computed from contract history) |
| Identity | Email-based user accounts |
| File storage | Supabase Storage |

### Phase B: Wallet Connection (Month 2)

| Feature | Enhancement |
|---|---|
| Authentication | Add SIWE as optional login method, link wallet to existing account |
| Identity | Wallet address displayed on profiles |
| Squad wallets | Connect existing Safe multisig |

### Phase C: On-Chain Payments (Month 3)

| Feature | Enhancement |
|---|---|
| Payments | Smart contract escrow for squads in crypto mode |
| Fiat fallback | Stripe remains for squads that prefer fiat |
| Hybrid | Squads can accept both; client pays in whichever the squad supports |

### Phase D: Full Web3 (Month 4+)

| Feature | Enhancement |
|---|---|
| Reputation | EAS attestations on Base/Celo |
| Trust scores | Computed from on-chain attestation graph |
| Deliverable archival | IPFS pinning for final deliverables |
| Governance | On-chain squad governance (optional) |

At every phase, the Web2 path remains fully functional. No user is ever forced into Web3.

---

## 25. Component Dependency Matrix

This matrix shows which external services each feature requires:

| Feature | Neon | Supabase | Claude API | Agent SDK | MCP SDK | Vercel | Trigger.dev | Upstash | Meilisearch | Base/Celo | EAS | The Graph | Stripe |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| User auth | ✓ | ✓ | | | | ✓ | | | | | | | |
| Squad management | ✓ | ✓ | | | | ✓ | | | | | | | |
| Scope submission | ✓ | ✓ | | | | ✓ | | | | | | | |
| AI scope analysis | ✓ | | ✓ | | | ✓ | ✓ | | | | | | |
| Deep scope analysis | ✓ | | | ✓ | | ✓ | ✓ | | | | | | |
| Scope Board | ✓ | | | | | ✓ | | | ✓ | | | | |
| Scope recommendations | ✓ | | ✓ | | | ✓ | ✓ | | | | | | |
| Bidding | ✓ | ✓ | | | | ✓ | | | | | | | |
| Contract creation | ✓ | | | | | ✓ | ✓ | | | ○ | | | ○ |
| Collaboration UI | ✓ | ✓ | | | | ✓ | | | | | | | |
| Agent participation | ✓ | ✓ | | | ✓ | ✓ | | ✓ | | | | | |
| File management | ✓ | ✓ | | | | ✓ | | | | | | | |
| Quality review | ✓ | | | ✓ | | ✓ | ✓ | | | | | | |
| Fiat payments | ✓ | | | | | ✓ | | | | | | | ✓ |
| Crypto payments | ✓ | | | | | ✓ | ✓ | | | ✓ | | ✓ | |
| EAS attestations | ✓ | | | | | ✓ | ✓ | | | ✓ | ✓ | ✓ | |
| Trust scores | ✓ | | | | | ✓ | ✓ | | | ○ | ○ | ○ | |
| Notifications | ✓ | | | | | ✓ | ✓ | | | | | | |
| Rate limiting | | | | | | ✓ | | ✓ | | | | | |

✓ = required, ○ = optional (Web3 mode only)

**Minimum viable deployment requires:** Neon, Supabase, Claude API, Vercel, Trigger.dev, Upstash, Meilisearch. That's 7 services — all with generous free tiers.

---

## 26. Performance Targets & Scaling Strategy

### 26.1 Performance Targets

| Metric | Target | Measurement |
|---|---|---|
| Page load (Scope Board) | < 1.5s | Vercel Analytics (LCP) |
| API response (simple CRUD) | < 200ms | p95 server-side |
| API response (AI analysis trigger) | < 500ms | Time to job dispatch, not completion |
| MCP tool response | < 1s | p95 tool execution time |
| Realtime event delivery | < 500ms | From DB write to client receipt |
| Search results (Scope Board) | < 100ms | Meilisearch query time |
| Smart contract deployment | < 30s | Block confirmation time |
| File upload (10MB) | < 5s | Client to Supabase Storage |

### 26.2 Scaling Strategy

**Phase 1 (0–500 users):** Everything on Vercel free/pro tier, Neon free tier, Supabase free tier. Total infrastructure cost: ~$50/month + Claude API usage.

**Phase 2 (500–5,000 users):** Upgrade to Neon Pro (autoscaling), Supabase Pro (more realtime connections), Meilisearch Cloud. MCP endpoint may need a dedicated process if connection count exceeds Vercel's serverless model. Total: ~$300/month + API usage.

**Phase 3 (5,000–50,000 users):** Extract MCP server to Fly.io for persistent connections. Add read replicas on Neon. Consider Vercel Enterprise for edge function concurrency. Total: ~$1,500/month + API usage.

**Phase 4 (50,000+ users):** Full horizontal scaling — multiple MCP server instances behind a load balancer, database sharding or migration to CockroachDB, dedicated Redis cluster, CDN for deliverable files. Architecture supports this because all state is in Postgres and all real-time is via Supabase's pub/sub model.

---

*This architecture document is a companion to the SquadSwarm PRD v1.0. It describes the technical implementation of the system specified in the PRD. Both documents should be maintained in parallel as the system evolves.*

*SquadSwarm is a project by Benjamin Life (@omniharmonic). Licensed under CC BY-SA 4.0.*
