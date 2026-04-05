export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, deliverables, bidAssignments, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
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

  // Auth: contract participant
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(and(eq(squadMembers.squadId, contract.squadId), eq(squadMembers.userId, session.userId)))
      .limit(1);
    if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Get all deliverables with weights
  const allDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  const weights = (contract.deliverableWeights || {}) as Record<string, number>;
  const totalAmount = parseFloat(contract.totalAmount);
  const paymentSchedule = (contract.paymentSchedule || {}) as Record<string, unknown>;
  const upfrontBps = (paymentSchedule.upfrontPercentage as number) || 0;
  const upfrontAmount = totalAmount * (upfrontBps / 100);
  const milestonePool = totalAmount - upfrontAmount;

  // Get milestone release records from payment schedule
  const milestoneReleases = (paymentSchedule.milestoneReleases as Array<{ deliverableId: string; txHash: string; amount: string; releasedAt: string }>) || [];

  // Calculate per-deliverable payment amounts
  const deliverablePayments = allDeliverables.map(d => {
    const weightBps = weights[d.id] || Math.round(10000 / (allDeliverables.length || 1));
    const amount = milestonePool * (weightBps / 10000);
    const release = milestoneReleases.find(r => r.deliverableId === d.id);
    return {
      id: d.id,
      title: d.title,
      status: d.status,
      weightBps,
      amount: parseFloat(amount.toFixed(2)),
      paid: !!release,
      releaseTxHash: release?.txHash || null,
      releasedAt: release?.releasedAt || null,
    };
  });

  const approvedCount = allDeliverables.filter(d => d.status === 'approved').length;
  const releasedFromMilestones = deliverablePayments
    .filter(d => d.releaseTxHash)
    .reduce((sum, d) => sum + d.amount, 0);
  const totalReleased = upfrontAmount + releasedFromMilestones;
  const remaining = totalAmount - totalReleased;

  // Get bid assignments for member-level payment tracking
  let memberPayments: { userId: string | null; agentId: string | null; shareBps: number; roleTitle: string | null }[] = [];
  if (contract.bidId) {
    const assignments = await db
      .select()
      .from(bidAssignments)
      .where(eq(bidAssignments.bidId, contract.bidId));

    // Aggregate by member
    const memberMap = new Map<string, { shareBps: number; roleTitle: string | null }>();
    for (const a of assignments) {
      const key = a.userId || a.agentId || 'unknown';
      const existing = memberMap.get(key);
      if (existing) {
        existing.shareBps += a.paymentShareBps;
      } else {
        memberMap.set(key, { shareBps: a.paymentShareBps, roleTitle: a.roleTitle });
      }
    }
    memberPayments = Array.from(memberMap.entries()).map(([key, val]) => ({
      userId: key.startsWith('unknown') ? null : (assignments.find(a => a.userId === key) ? key : null),
      agentId: key.startsWith('unknown') ? null : (assignments.find(a => a.agentId === key) ? key : null),
      shareBps: val.shareBps,
      roleTitle: val.roleTitle,
    }));
  }

  return NextResponse.json({
    contractId,
    totalAmount,
    token: 'USDC',
    chain: 'base',
    upfront: {
      percentage: upfrontBps,
      amount: parseFloat(upfrontAmount.toFixed(2)),
      paid: contract.status !== 'pending_deposit',
    },
    milestones: {
      pool: parseFloat(milestonePool.toFixed(2)),
      deliverables: deliverablePayments,
    },
    summary: {
      totalReleased: parseFloat(totalReleased.toFixed(2)),
      remaining: parseFloat(remaining.toFixed(2)),
      approvedCount,
      totalDeliverables: allDeliverables.length,
      percentComplete: allDeliverables.length > 0
        ? Math.round((approvedCount / allDeliverables.length) * 100)
        : 0,
    },
    memberSplits: memberPayments,
    splitterAddress: contract.paymentSplitterAddress,
    escrowAddress: contract.smartContractAddress,
    depositTxHash: (paymentSchedule.depositTxHash as string) || null,
  });
}
