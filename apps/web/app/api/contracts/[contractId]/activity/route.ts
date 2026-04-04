export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, contracts, activityLog, squadMembers, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth check
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, contract.squadId),
          eq(squadMembers.userId, session.userId)
        )
      )
      .limit(1);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const rows = await db
    .select()
    .from(activityLog)
    .where(eq(activityLog.contractId, contractId))
    .orderBy(desc(activityLog.createdAt));

  // Resolve actor names
  const userIds = [...new Set(rows.filter(r => r.actorUserId).map(r => r.actorUserId!))];
  const agentIds = [...new Set(rows.filter(r => r.actorAgentId).map(r => r.actorAgentId!))];

  const actorNames: Record<string, { name: string; isAgent: boolean }> = {};

  for (const uid of userIds) {
    const [u] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, uid)).limit(1);
    if (u) actorNames[uid] = { name: u.displayName || u.email || 'Unknown', isAgent: false };
  }

  for (const aid of agentIds) {
    const [a] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, aid)).limit(1);
    if (a) actorNames[aid] = { name: a.name, isAgent: true };
  }

  const enriched = rows.map(r => ({
    ...r,
    actorName: r.actorAgentId
      ? actorNames[r.actorAgentId]?.name || 'Unknown Agent'
      : r.actorUserId
        ? actorNames[r.actorUserId]?.name || 'Unknown'
        : 'System',
    actorIsAgent: !!r.actorAgentId,
  }));

  return NextResponse.json(enriched);
}
