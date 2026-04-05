export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, workstreams, deliverables, squadMembers, squads, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getAgentSession } from '@/lib/agent-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  const agentSession = !session ? await getAgentSession(req) : null;
  if (!session && !agentSession) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  if (agentSession && agentSession.contractId !== contractId) {
    return NextResponse.json({ error: 'Token not scoped to this contract' }, { status: 403 });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth check for user sessions
  if (!agentSession) {
    const isClient = contract.clientId === session!.userId;
    if (!isClient) {
      const [membership] = await db
        .select()
        .from(squadMembers)
        .where(
          and(
            eq(squadMembers.squadId, contract.squadId),
            eq(squadMembers.userId, session!.userId)
          )
        )
        .limit(1);
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  // Fetch squad name
  const [squad] = await db
    .select({ name: squads.name })
    .from(squads)
    .where(eq(squads.id, contract.squadId))
    .limit(1);

  // Fetch client name
  const [client] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, contract.clientId))
    .limit(1);

  // Fetch workstreams with deliverables
  const wsRows = await db
    .select()
    .from(workstreams)
    .where(eq(workstreams.contractId, contractId))
    .orderBy(workstreams.orderIndex);

  const delRows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  // Fetch assignee names for deliverables
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

  const workstreamsWithDeliverables = wsRows.map(ws => ({
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

  return NextResponse.json({
    ...contract,
    clientName: client?.displayName || client?.email || 'Unknown Client',
    squadName: squad?.name || 'Unknown Squad',
    workstreams: workstreamsWithDeliverables,
  });
}
