export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, scopes, bids } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scopeId } = await params;

  // Try by scope ID first, then by proposal ID as fallback
  let [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, scopeId))
    .limit(1);

  if (!scope) {
    [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.proposalId, scopeId))
      .limit(1);
  }

  if (!scope) return NextResponse.json({ error: 'Scope not found' }, { status: 404 });

  const [bidCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(bids)
    .where(eq(bids.scopeId, scopeId));

  return NextResponse.json({
    ...scope,
    bidCount: bidCount?.count ?? 0,
  });
}
