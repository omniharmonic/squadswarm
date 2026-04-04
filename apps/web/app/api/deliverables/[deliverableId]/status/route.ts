export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, deliverables, contracts, squadMembers, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  not_started: ['in_progress'],
  in_progress: ['in_review', 'blocked'],
  in_review: ['approved', 'revision_requested'],
  revision_requested: ['in_progress'],
  blocked: ['in_progress'],
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliverableId } = await params;
  const body = await req.json();
  const { status: newStatus } = body;

  if (!newStatus) {
    return NextResponse.json({ error: 'Missing status field' }, { status: 400 });
  }

  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);

  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  // Auth: user must be contract participant
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, deliverable.contractId))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

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

  // Validate transition
  const allowed = ALLOWED_TRANSITIONS[deliverable.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Invalid transition from '${deliverable.status}' to '${newStatus}'` },
      { status: 422 }
    );
  }

  // Update deliverable status
  const [updated] = await db
    .update(deliverables)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  // Create activity log entry
  await db.insert(activityLog).values({
    contractId: deliverable.contractId,
    actorUserId: session.userId,
    action: 'deliverable_status_changed',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: {
      title: deliverable.title,
      from: deliverable.status,
      to: newStatus,
    },
  });

  return NextResponse.json(updated);
}
