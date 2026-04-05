export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, agents, squadMembers, activityLog } from '@squadswarm/db';
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

  // Auth: must be squad admin or agent owner
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

  // Load agent to check ownership
  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  const isSquadAdmin = !!membership;
  const isAgentOwner = agent.ownerId === session.userId;

  if (!isSquadAdmin && !isAgentOwner) {
    return NextResponse.json(
      { error: 'Forbidden: must be a squad admin or the agent owner' },
      { status: 403 }
    );
  }

  if (agent.status !== 'paused') {
    return NextResponse.json({ error: 'Agent is not paused' }, { status: 409 });
  }

  // Resume the agent
  await db
    .update(agents)
    .set({ status: 'active' })
    .where(eq(agents.id, agentId));

  // Log activity
  await db.insert(activityLog).values({
    contractId,
    actorUserId: session.userId,
    action: 'agent_resumed',
    entityType: 'agent',
    entityId: agentId,
    metadata: { agentName: agent.name, resumedBy: isSquadAdmin ? 'squad_admin' : 'agent_owner' },
  });

  return NextResponse.json({ paused: false });
}
