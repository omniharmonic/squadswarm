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

  // Auth: only the contract client can approve deliverables
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    return NextResponse.json({ error: 'Only the contract client can approve deliverables' }, { status: 403 });
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

  // Calculate proportional USDC payment release for this deliverable
  const allContractDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, deliverable.contractId));

  const totalDeliverables = allContractDeliverables.length;
  const totalAmount = parseFloat(contract.totalAmount);
  const deliverablePayment = totalDeliverables > 0 ? totalAmount / totalDeliverables : 0;

  // Count how many are now approved (including the one we just approved)
  const nowApprovedCount = allContractDeliverables.filter(d =>
    d.id === deliverableId ? true : d.status === 'approved'
  ).length;
  const releasedAmount = deliverablePayment * nowApprovedCount;

  // Log activity with payment release info
  await db.insert(activityLog).values({
    contractId: deliverable.contractId,
    actorUserId: session.userId,
    action: 'deliverable_approved',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: {
      title: deliverable.title,
      paymentReleased: deliverablePayment.toFixed(2),
      token: 'USDC',
      chain: 'base',
    },
  });

  // Log the payment pending event (actual on-chain release happens separately)
  await db.insert(activityLog).values({
    contractId: deliverable.contractId,
    actorUserId: session.userId,
    action: 'payment_pending',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: {
      amount: deliverablePayment.toFixed(2),
      totalReleased: releasedAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      deliverableIndex: nowApprovedCount,
      totalDeliverables,
      token: 'USDC',
      chain: 'base',
    },
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
        metadata: {
          totalAmount: totalAmount.toFixed(2),
          totalReleased: totalAmount.toFixed(2),
          token: 'USDC',
          chain: 'base',
          allDeliverablesApproved: true,
        },
      });
    }
  }

  return NextResponse.json(updated);
}
