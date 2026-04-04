export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, workstreams, deliverables, squadMembers, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
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

  const wsRows = await db
    .select()
    .from(workstreams)
    .where(eq(workstreams.contractId, contractId))
    .orderBy(workstreams.orderIndex);

  const delRows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  // Resolve assignee names
  const memberIds = [...new Set(delRows.filter(d => d.assignedMemberId).map(d => d.assignedMemberId!))];
  const agentIds = [...new Set(delRows.filter(d => d.assignedAgentId).map(d => d.assignedAgentId!))];

  const memberNames: Record<string, string> = {};
  for (const mid of memberIds) {
    const [u] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, mid)).limit(1);
    if (u) memberNames[mid] = u.displayName || u.email || 'Unknown';
  }

  const agentNames: Record<string, string> = {};
  for (const aid of agentIds) {
    const [a] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, aid)).limit(1);
    if (a) agentNames[aid] = `${a.name} (Agent)`;
  }

  const grouped = wsRows.map(ws => ({
    ...ws,
    deliverables: delRows
      .filter(d => d.workstreamId === ws.id)
      .map(d => ({
        ...d,
        assignee: d.assignedAgentId
          ? agentNames[d.assignedAgentId] || 'Unassigned Agent'
          : d.assignedMemberId
            ? memberNames[d.assignedMemberId] || 'Unassigned'
            : 'Unassigned',
      })),
  }));

  return NextResponse.json(grouped);
}
