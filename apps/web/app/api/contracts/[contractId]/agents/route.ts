export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { db, contracts, agents, deliverables, squadMembers, agentActionQueue } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Load contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: contract participant (client or squad member)
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

  // Get all deliverables with assigned agents for this contract
  const agentDeliverables = await db
    .select()
    .from(deliverables)
    .where(
      and(
        eq(deliverables.contractId, contractId),
        isNotNull(deliverables.assignedAgentId)
      )
    );

  // Collect unique agent IDs
  const agentIds = [...new Set(agentDeliverables.map(d => d.assignedAgentId!))];

  if (agentIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get agent info, their deliverables, and queue counts
  const result = [];

  for (const agentId of agentIds) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(eq(agents.id, agentId))
      .limit(1);

    if (!agent) continue;

    // Deliverables assigned to this agent in this contract
    const assignedDeliverables = agentDeliverables
      .filter(d => d.assignedAgentId === agentId)
      .map(d => ({
        id: d.id,
        title: d.title,
        status: d.status,
        format: d.format,
      }));

    // Pending queue count
    const [pendingCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentActionQueue)
      .where(
        and(
          eq(agentActionQueue.contractId, contractId),
          eq(agentActionQueue.agentId, agentId),
          eq(agentActionQueue.status, 'pending')
        )
      );

    // Total activity count (all queue entries, any status)
    const [activityCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agentActionQueue)
      .where(
        and(
          eq(agentActionQueue.contractId, contractId),
          eq(agentActionQueue.agentId, agentId)
        )
      );

    result.push({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      provider: agent.provider,
      model: agent.model,
      autonomyLevel: agent.autonomyLevel,
      status: agent.status,
      assignedDeliverables,
      pendingQueueCount: pendingCount?.count || 0,
      totalActivityCount: activityCount?.count || 0,
    });
  }

  return NextResponse.json(result);
}
