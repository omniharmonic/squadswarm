import { describe, it, expect, beforeAll } from 'vitest';
import { Pool } from 'pg';

/**
 * IDOR / authorization regression suite.
 *
 * These are the exact cross-tenant probes from the production-readiness audit,
 * encoded so the fixes can never silently regress. They run against a live dev
 * server + database, so they are opt-in:
 *
 *   TEST_BASE_URL=http://localhost:3000 \
 *   DATABASE_URL=postgresql://squad:squad@localhost:5432/squadswarm \
 *   pnpm vitest run tests/integration/idor.test.ts
 */
const BASE = process.env.TEST_BASE_URL;
const DB = process.env.DATABASE_URL;
const run = BASE && DB ? describe : describe.skip;

const pool = DB ? new Pool({ connectionString: DB }) : null;

async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await pool!.query(text, params);
  return res.rows as T[];
}

/** Log in via magic link and return the session cookie string. */
async function login(email: string): Promise<string> {
  await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const [row] = await sql<{ token: string }>(
    `select token from magic_links where email=$1 and used=false order by created_at desc limit 1`,
    [email.toLowerCase().trim()],
  );
  const res = await fetch(`${BASE}/api/auth/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: row.token }),
  });
  const cookie = res.headers.get('set-cookie') ?? '';
  return cookie.split(';')[0]!;
}

run('Authorization / IDOR regressions', () => {
  let ownerCookie = '';
  let attackerCookie = '';
  let squadId = '';
  let scopeId = '';
  let bidId = '';

  beforeAll(async () => {
    const stamp = Date.now();
    ownerCookie = await login(`owner_${stamp}@test.local`);
    attackerCookie = await login(`attacker_${stamp}@test.local`);

    // Owner creates a squad.
    const squadRes = await fetch(`${BASE}/api/squads`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: ownerCookie },
      body: JSON.stringify({ name: `Owner Squad ${stamp}`, bio: 'test' }),
    });
    squadId = (await squadRes.json()).id;

    const [owner] = await sql<{ id: string }>(
      `select id from users where email=$1`,
      [`owner_${stamp}@test.local`],
    );

    // Seed a confidential scope + a bid directly (bypassing AI flow).
    const [scope] = await sql<{ id: string }>(
      `insert into scopes (client_id,title,narrative,budget_min,budget_max,timeline_days,feedback_rounds,bidding_deadline,status,confidentiality,work_plan)
       values ($1,'Secret','secret narrative',1000,5000,30,3,now()+interval '7 days','open','confidential','{}'::jsonb) returning id`,
      [owner.id],
    );
    scopeId = scope.id;

    const [bid] = await sql<{ id: string }>(
      `insert into bids (scope_id,squad_id,created_by_id,approach,proposed_price,status)
       values ($1,$2,$3,'secret approach',4200,'submitted') returning id`,
      [scopeId, squadId, owner.id],
    );
    bidId = bid.id;
  });

  it('non-member cannot read a squad bid (was: 200 leak)', async () => {
    const res = await fetch(`${BASE}/api/bids/${bidId}`, { headers: { cookie: attackerCookie } });
    expect(res.status).toBe(403);
  });

  it('bidding squad member can read their own bid', async () => {
    const res = await fetch(`${BASE}/api/bids/${bidId}`, { headers: { cookie: ownerCookie } });
    expect(res.status).toBe(200);
  });

  it('non-member cannot read a squad roster (was: email leak)', async () => {
    const res = await fetch(`${BASE}/api/squads/${squadId}/members`, { headers: { cookie: attackerCookie } });
    expect(res.status).toBe(403);
  });

  it('non-client cannot read a confidential scope', async () => {
    const res = await fetch(`${BASE}/api/scopes/${scopeId}`, { headers: { cookie: attackerCookie } });
    expect(res.status).toBe(403);
  });

  it('client can read their own confidential scope', async () => {
    const res = await fetch(`${BASE}/api/scopes/${scopeId}`, { headers: { cookie: ownerCookie } });
    expect(res.status).toBe(200);
  });

  it('unauthenticated requests are rejected', async () => {
    const res = await fetch(`${BASE}/api/users/me`);
    expect(res.status).toBe(401);
  });
});
