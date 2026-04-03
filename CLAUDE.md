# SquadSwarm Development Guide

## Project Structure

Turborepo monorepo:
- `apps/web/` — Next.js 15 App Router application (deploys to Vercel)
- `packages/db/` — Drizzle ORM schema, migrations, service functions (Neon PostgreSQL)
- `packages/ai/` — Claude API integration (Scope Analyst, Suggestion Engine)
- `packages/shared/` — Zod schemas, constants, enums, types
- `packages/ui/` — Shared React components
- `packages/mcp-server/` — MCP tool definitions (future)
- `packages/web3/` — Smart contract ABIs, wagmi config (future)

## Key Conventions

- All API routes: `export const dynamic = 'force-dynamic';` at top
- Next.js 15 params: `{ params }: { params: Promise<{ id: string }> }` (must await)
- Import from barrel exports: `import { db, users, squads } from '@squadswarm/db';`
- Auth: `import { getSession } from '@/lib/auth';` returns `{ userId, email } | null`
- Path alias: `@/*` maps to `apps/web/*`
- Lazy initialization for server-side clients (DB, Resend) to avoid build-time errors

## Design System

Colors (Tailwind 4 @theme CSS vars):
- Background: `bg-primary` (#FAF8F5), `bg-secondary` (#F0EDE8)
- Text: `text-primary` (#2C2825), `text-secondary` (#6B6560)
- Accents: `accent-squad` (#C4553A terracotta), `accent-agent` (#3A8C8C teal), `accent-client` (#D4A03C amber)
- Status: `success` (#3C7A4A), `warning` (#CC7A2E), `error` (#A63D2F), `escrow` (#5A7A8C)

Typography: DM Sans (body), JetBrains Mono (code)

## Commands

```bash
pnpm dev          # Start all dev servers
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm typecheck    # Type-check all packages
```
