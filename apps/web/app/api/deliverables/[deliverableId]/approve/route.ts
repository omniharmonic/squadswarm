export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, deliverables, contracts, workstreams, squadMembers, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliverableId } = await params;

  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);

  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, deliverable.contractId))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Auth: user must be contract participant
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

  // Only in_review deliverables can be approved
  if (deliverable.status !== 'in_review') {
    return NextResponse.json(
      { error: `Cannot approve deliverable with status '${deliverable.status}'. Must be 'in_review'.` },
      { status: 422 }
    );
  }

  // Approve the deliverable
  const [updated] = await db
    .update(deliverables)
    .set({ status: 'approved', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  // Log activity
  await db.insert(activityLog).values({
    contractId: deliverable.contractId,
    actorUserId: session.userId,
    action: 'deliverable_approved',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: { title: deliverable.title },
  });

  // Check if all deliverables in the workstream are approved
  const wsDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.workstreamId, deliverable.workstreamId));

  const allApproved = wsDeliverables.every(d =>
    d.id === deliverableId ? true : d.status === 'approved'
  );

  if (allApproved) {
    await db
      .update(workstreams)
      .set({ status: 'completed', endDate: new Date(), updatedAt: new Date() })
      .where(eq(workstreams.id, deliverable.workstreamId));

    await db.insert(activityLog).values({
      contractId: deliverable.contractId,
      actorUserId: session.userId,
      action: 'workstream_completed',
      entityType: 'workstream',
      entityId: deliverable.workstreamId,
      metadata: {},
    });

    // Check if all workstreams in contract are completed
    const contractWorkstreams = await db
      .select()
      .from(workstreams)
      .where(eq(workstreams.contractId, deliverable.contractId));

    const allWsComplete = contractWorkstreams.every(ws =>
      ws.id === deliverable.workstreamId ? true : ws.status === 'completed'
    );

    if (allWsComplete) {
      await db
        .update(contracts)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(contracts.id, deliverable.contractId));

      await db.insert(activityLog).values({
        contractId: deliverable.contractId,
        actorUserId: session.userId,
        action: 'contract_completed',
        entityType: 'contract',
        entityId: deliverable.contractId,
        metadata: {},
      });
    }
  }

  return NextResponse.json(updated);
}
