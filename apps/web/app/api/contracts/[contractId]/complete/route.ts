export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, contracts, deliverables, activityLog, squads, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/**
 * Stub: In production this would call Stripe to release held funds.
 */
async function releaseStripePayment(_contractId: string, _amount: string): Promise<void> {
  // Stripe release stub — no-op until API key is configured
  console.log(`[Stripe Stub] Releasing payment for contract ${_contractId}: $${_amount}`);
}

/**
 * Recalculate trust scores for all squad members and the squad itself.
 * Simple formula: base score + completed contracts bonus.
 */
async function recalculateTrustScores(squadId: string): Promise<void> {
  try {
    // Count completed contracts for this squad
    const completedContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.squadId, squadId));

    const completedCount = completedContracts.filter((c) => c.status === 'completed').length;

    // Simple trust score: 50 base + 10 per completed contract, capped at 100
    const squadScore = Math.min(100, 50 + completedCount * 10);

    await db
      .update(squads)
      .set({ trustScore: String(squadScore), updatedAt: new Date() })
      .where(eq(squads.id, squadId));

    // Update trust scores for all members in the squad
    const members = await db
      .select({ userId: squadMembers.userId })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, squadId));

    for (const member of members) {
      // Count contracts where user's squad was involved
      const memberScore = Math.min(100, 50 + completedCount * 8);
      await db
        .update(users)
        .set({ trustScore: sql`GREATEST(${String(memberScore)}::numeric, ${users.trustScore})`, updatedAt: new Date() })
        .where(eq(users.id, member.userId));
    }
  } catch (error) {
    console.error('Trust score recalculation error:', error);
    // Non-fatal — don't fail the completion
  }
}

export async function POST(
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
  if (contract.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the client can complete a contract' }, { status: 403 });
  }
  if (contract.status !== 'active' && contract.status !== 'in_review') {
    return NextResponse.json({ error: `Cannot complete a contract in ${contract.status} status` }, { status: 400 });
  }

  // Check all deliverables are approved
  const pendingDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  const unapproved = pendingDeliverables.filter((d) => d.status !== 'approved');
  if (unapproved.length > 0) {
    return NextResponse.json({
      error: `${unapproved.length} deliverable(s) not yet approved`,
      unapproved: unapproved.map((d) => ({ id: d.id, title: d.title, status: d.status })),
    }, { status: 400 });
  }

  // Determine payment mode from squad
  const [squad] = await db
    .select({ paymentMode: squads.paymentMode })
    .from(squads)
    .where(eq(squads.id, contract.squadId))
    .limit(1);

  const paymentMode = squad?.paymentMode || 'fiat';

  // Release payment based on mode
  if (paymentMode === 'fiat') {
    await releaseStripePayment(contractId, contract.totalAmount);
  }
  // For crypto mode: on-chain release is initiated by the client's wallet.
  // The contract completion here just records it server-side.

  // Mark contract as completed
  const [updated] = await db
    .update(contracts)
    .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
    .where(eq(contracts.id, contractId))
    .returning();

  // Log completion in activity log
  try {
    await db.insert(activityLog).values({
      contractId,
      actorUserId: session.userId,
      action: 'contract_completed',
      entityType: 'contract',
      entityId: contractId,
      metadata: {
        totalAmount: contract.totalAmount,
        paymentMode,
        deliverablesCount: pendingDeliverables.length,
        completedAt: new Date().toISOString(),
      },
    });
  } catch (logError) {
    console.error('Activity log error:', logError);
    // Non-fatal
  }

  // Trigger trust score recalculation for all participants
  await recalculateTrustScores(contract.squadId);

  return NextResponse.json(updated);
}
