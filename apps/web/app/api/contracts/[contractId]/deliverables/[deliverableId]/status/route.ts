export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, deliverables, squadMembers, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getAgentSession } from '@/lib/agent-auth';

const VALID_STATUSES = ['not_started', 'in_progress', 'in_review', 'blocked'] as const;
type ValidStatus = typeof VALID_STATUSES[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string; deliverableId: string }> }
) {
  const session = await getSession();
  const agentSession = !session ? await getAgentSession(req) : null;
  if (!session && !agentSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contractId, deliverableId } = await params;

  if (agentSession && agentSession.contractId !== contractId) {
    return NextResponse.json({ error: 'Token not valid for this contract' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { status, note } = body;

  if (!status || !VALID_STATUSES.includes(status as ValidStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.contractId, contractId)))
    .limit(1);

  if (!deliverable) return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });

  // Auth: human must be contract participant
  if (session) {
    const isClient = contract.clientId === session.userId;
    const isAssigned = deliverable.assignedMemberId === session.userId;
    if (!isClient && !isAssigned) {
      const [membership] = await db
        .select()
        .from(squadMembers)
        .where(and(eq(squadMembers.squadId, contract.squadId), eq(squadMembers.userId, session.userId)))
        .limit(1);
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Agent can only update deliverables assigned to them
  if (agentSession && deliverable.assignedAgentId !== agentSession.agentId) {
    return NextResponse.json({ error: 'Agent can only update their assigned deliverables' }, { status: 403 });
  }

  const [updated] = await db
    .update(deliverables)
    .set({ status, updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  await db.insert(activityLog).values({
    contractId,
    actorUserId: session?.userId || null,
    actorAgentId: agentSession?.agentId || null,
    action: 'deliverable_status_changed',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: {
      title: deliverable.title,
      from: deliverable.status,
      to: status,
      note: note || null,
    },
  });

  return NextResponse.json(updated);
}
