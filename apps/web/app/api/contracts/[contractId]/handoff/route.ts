export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, workstreams, deliverables, squadMembers, squads, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
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

  if (contract.status !== 'completed') {
    return NextResponse.json(
      { error: 'Handoff package is only available for completed contracts' },
      { status: 400 },
    );
  }

  // Auth check: client or squad member
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, contract.squadId),
          eq(squadMembers.userId, session.userId),
        ),
      )
      .limit(1);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Fetch squad info
  const [squad] = await db
    .select({ name: squads.name })
    .from(squads)
    .where(eq(squads.id, contract.squadId))
    .limit(1);

  // Fetch client info
  const [client] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, contract.clientId))
    .limit(1);

  // Fetch approved deliverables
  const delRows = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  const approvedDeliverables = delRows.filter((d) => d.status === 'approved');

  // Fetch team members
  const members = await db
    .select({
      userId: squadMembers.userId,
      role: squadMembers.role,
    })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, contract.squadId));

  const teamMembers = [];
  for (const m of members) {
    const [u] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, m.userId))
      .limit(1);
    if (u) {
      teamMembers.push({
        userId: m.userId,
        name: u.displayName || u.email || 'Unknown',
        role: m.role,
      });
    }
  }

  // Fetch agents that contributed (assigned to deliverables)
  const agentIds = [...new Set(delRows.filter((d) => d.assignedAgentId).map((d) => d.assignedAgentId!))];
  const contributingAgents = [];
  for (const aid of agentIds) {
    const [a] = await db
      .select({ id: agents.id, name: agents.name, description: agents.description })
      .from(agents)
      .where(eq(agents.id, aid))
      .limit(1);
    if (a) contributingAgents.push(a);
  }

  return NextResponse.json({
    contractTitle: contract.title,
    completionDate: contract.completedAt?.toISOString() || null,
    clientName: client?.displayName || client?.email || 'Unknown Client',
    squadName: squad?.name || 'Unknown Squad',
    totalPayment: contract.totalAmount,
    approvedDeliverables: approvedDeliverables.map((d) => ({
      id: d.id,
      title: d.title,
      format: d.format,
      status: d.status,
    })),
    teamMembers,
    contributingAgents,
  });
}
