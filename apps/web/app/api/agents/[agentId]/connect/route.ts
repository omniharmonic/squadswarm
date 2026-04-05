export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, agents, contracts, deliverables } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { createAgentToken } from '@/lib/agent-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;
  const body = await req.json().catch(() => ({}));
  const { contractId } = body;

  if (!contractId) {
    return NextResponse.json({ error: 'contractId is required' }, { status: 400 });
  }

  // Verify agent exists and caller is the owner
  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, session.userId)))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found or you are not the owner' }, { status: 404 });
  }

  if (agent.status === 'paused') {
    return NextResponse.json({ error: 'Agent is paused. Ask a squad admin to resume it.' }, { status: 403 });
  }

  // Verify contract exists
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  if (contract.status !== 'active' && contract.status !== 'in_review') {
    return NextResponse.json(
      { error: `Cannot connect to contract in '${contract.status}' status` },
      { status: 400 }
    );
  }

  // Verify agent is assigned to at least one deliverable in this contract
  const assignedDeliverables = await db
    .select()
    .from(deliverables)
    .where(
      and(
        eq(deliverables.contractId, contractId),
        eq(deliverables.assignedAgentId, agentId)
      )
    );

  if (assignedDeliverables.length === 0) {
    return NextResponse.json(
      { error: 'Agent is not assigned to any deliverables in this contract' },
      { status: 403 }
    );
  }

  // Generate scoped agent token
  const autonomyLevel = (agent.autonomyLevel as 'supervised' | 'trusted' | 'autonomous') || 'supervised';

  const mcpToken = await createAgentToken({
    agentId,
    contractId,
    ownerId: session.userId,
    autonomyLevel,
  });

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  return NextResponse.json({
    mcpToken,
    mcpEndpoint: `${baseUrl}/api/mcp`,
    expiresAt,
    agentName: agent.name,
    contractTitle: contract.title,
    autonomyLevel,
    assignedDeliverables: assignedDeliverables.map(d => ({
      id: d.id,
      title: d.title,
      status: d.status,
    })),
  });
}
