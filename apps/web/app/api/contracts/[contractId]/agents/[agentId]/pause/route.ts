export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, agents, agentActionQueue, squadMembers, activityLog, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string; agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId, agentId } = await params;

  // Load contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: must be squad admin
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, session.userId),
        eq(squadMembers.role, 'admin')
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: must be a squad admin' }, { status: 403 });
  }

  // Load agent
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  if (agent.status === 'paused') {
    return NextResponse.json({ error: 'Agent is already paused' }, { status: 409 });
  }

  // Pause the agent
  await db
    .update(agents)
    .set({ status: 'paused' })
    .where(eq(agents.id, agentId));

  // Reject all pending queue entries for this agent in this contract
  await db
    .update(agentActionQueue)
    .set({
      status: 'rejected',
      reviewedBy: session.userId,
      reviewedAt: new Date(),
      reviewNote: 'Auto-rejected: agent paused by squad admin',
    })
    .where(
      and(
        eq(agentActionQueue.contractId, contractId),
        eq(agentActionQueue.agentId, agentId),
        eq(agentActionQueue.status, 'pending')
      )
    );

  // Log activity
  await db.insert(activityLog).values({
    contractId,
    actorUserId: session.userId,
    action: 'agent_paused',
    entityType: 'agent',
    entityId: agentId,
    metadata: { agentName: agent.name },
  });

  // Notify agent owner
  await db.insert(notifications).values({
    userId: agent.ownerId,
    type: 'agent_paused',
    title: `Your agent "${agent.name}" has been paused`,
    body: `A squad admin paused your agent on contract "${contract.title}". All pending actions were rejected.`,
    metadata: { contractId, agentId },
  });

  return NextResponse.json({ paused: true });
}
