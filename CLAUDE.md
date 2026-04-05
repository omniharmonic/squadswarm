# SquadSwarm Development Guide

## Project Structure

Turborepo monorepo:
- `apps/web/` — Next.js 15 App Router application (deploys to Vercel)
- `packages/db/` — Drizzle ORM schema, migrations, service functions (Neon PostgreSQL)
- `packages/ai/` — Claude API integration (Scope Analyst, Suggestion Engine)
- `packages/shared/` — Zod schemas, constants, enums, types
- `packages/ui/` — Shared React components
- `packages/mcp-server/` — MCP server (11 tools, API-based, agent JWT auth)
- `packages/web3/` — Smart contract ABIs (SquadSwarmEscrow, PaymentSplitter, MockUSDC)

## Key Conventions

- All API routes: `export const dynamic = 'force-dynamic';` at top
- Next.js 15 params: `{ params }: { params: Promise<{ id: string }> }` (must await)
- Import from barrel exports: `import { db, users, squads } from '@squadswarm/db';`
- Auth: `import { getSession } from '@/lib/auth';` returns `{ userId, email } | null`
- Path alias: `@/*` maps to `apps/web/*`
- Lazy initialization for server-side clients (DB, Resend) to avoid build-time errors
- Agent auth: `import { getAgentSession } from '@/lib/agent-auth';` for MCP agent JWT tokens
- Contract access: `import { getContractRole } from '@/lib/contract-access';` returns 'client' | 'squad_admin' | 'squad_member' | null
- API routes that agents call must support BOTH session auth and agent JWT auth (check session first, fall back to agent token)

## Collaborative Features

### Bid Governance
- Squads vote on bids before submission: consent (72h, no objections), majority (>50%), delegated (lead approves)
- Tables: `bid_votes` (per-member votes), `bid_assignments` (deliverable→member/agent mapping + payment splits)
- Flow: draft → under_review (squad votes) → ratified → submitted (to client) → accepted (contract created)

### Agent Integration (MCP)
- Agents connect via `POST /api/agents/[agentId]/connect` → returns scoped JWT
- MCP server at `packages/mcp-server/` calls app API routes via HTTP (not direct DB)
- Three autonomy levels: supervised (all actions queued), trusted (only final submissions queued), autonomous (direct)
- `agent_action_queue` table gates actions requiring human approval
- Agent payment modes: `owner` (to agent owner's wallet), `own_wallet` (agent's wallet), `treasury` (squad multisig)

### Contract Workspace
- `/contracts/[id]/workspace` — Kanban board, messages, agent queue, payment tracker, activity log
- Messages support both human and agent authors (channelType: general, workstream, deliverable, clientSquad, internal)
- Payment tracking: deliverable weights (from estimated hours), milestone releases with on-chain tx hashes

### On-Chain Contracts (Base Sepolia)
- Escrow: `0x72DDc03C12518D97A84A54b2DA651deF069EA2cf`
- PaymentSplitter: `0xfA1Ca09AE632D5f203d6A71CD1DB97F52dED7329`
- MockUSDC: `0xD4848e222Ab442E1100f59255b46C721D1555Eaa`
- Client-side wallet calls (viem), server records results

## Design System

Brand: Tree ring / network cross-section aesthetic. Organic + structured.
Logo: `public/logo-512.png`, `public/logo-192.png`, `public/logo-64.png`

Colors (Tailwind 4 @theme CSS vars in `globals.css`):
- Background: `bg-primary` (#FAFAF8), `bg-secondary` (#F0EEEB), `bg-elevated` (#FFFFFF)
- Text: `text-primary` (#1A1A1A), `text-secondary` (#64635F), `text-muted` (#9C9A95)
- Primary/Squad: `accent-squad` (#bb6b44 terracotta), `accent-squad-hover` (#a85d3a)
- Secondary/Agent: `accent-agent` (#4e8c88 teal), `accent-agent-hover` (#437a76)
- Client: `accent-client` (#C49A3C amber)
- Status: `success` (#3C7A4A), `warning` (#CC7A2E), `error` (#A63D2F), `escrow` (#5A7A8C)
- Border: `border` (#E5E3DF), `border-light` (#F0EEEB)

Typography: DM Sans (body), JetBrains Mono (code)

UI patterns:
- Buttons: `bg-accent-squad text-white rounded-xl hover:bg-accent-squad-hover`
- Inputs: `border border-border rounded-xl bg-bg-primary focus:ring-2 focus:ring-accent-agent/40`
- Cards: `bg-white rounded-2xl border border-border`
- Links: `text-accent-agent hover:text-accent-agent-hover`

## Commands

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
```
