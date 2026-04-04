export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, contracts, deliverables, activityLog, squadMembers, squads, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/**
 * Log that the on-chain USDC release should be triggered.
 * Actual fund release happens client-side via the SquadSwarmEscrow contract on Base.
 */
async function logPaymentRelease(_contractId: string, _amount: string): Promise<void> {
  console.log(`[Crypto] Contract ${_contractId} completed — $${_amount} USDC release pending on Base`);
}

/**
 * Recalculate trust scores for all squad members and the squad itself.
 * Formula: base 50 + 10 per completed contract + rating adjustments (+5 per 4-5 star, -5 per 1-2 star). Capped at [0, 100].
 */
async function recalculateTrustScores(squadId: string): Promise<void> {
  try {
    // Count completed contracts for this squad
    const squadContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.squadId, squadId));

    const completedCount = squadContracts.filter((c) => c.status === 'completed').length;

    // Gather all ratings for contracts in this squad
    const completedContractIds = squadContracts
      .filter((c) => c.status === 'completed')
      .map((c) => c.id);

    let positiveRatings = 0;
    let negativeRatings = 0;

    for (const cId of completedContractIds) {
      const [ratingEntry] = await db
        .select()
        .from(activityLog)
        .where(
          and(
            eq(activityLog.contractId, cId),
            eq(activityLog.action, 'contract_rated')
          )
        )
        .limit(1);

      if (ratingEntry) {
        const meta = ratingEntry.metadata as Record<string, unknown>;
        const overall = Number(meta.overall);
        if (overall >= 4) positiveRatings++;
        else if (overall <= 2) negativeRatings++;
      }
    }

    const ratingBonus = positiveRatings * 5 - negativeRatings * 5;

    // Squad score: 50 base + 10 per completed contract + rating adjustments
    const squadScore = Math.max(0, Math.min(100, 50 + completedCount * 10 + ratingBonus));

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
      const memberScore = Math.max(0, Math.min(100, 50 + completedCount * 8 + ratingBonus));
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

  // All payments are crypto-native (USDC on Base).
  // On-chain release is initiated by the client's wallet via the escrow contract.
  // This endpoint records the server-side state change.
  await logPaymentRelease(contractId, contract.totalAmount);

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
        paymentMode: 'crypto',
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

  // Create EAS attestations (off-chain for now, on-chain when both parties have wallets)
  try {
    const { createContractAttestations } = await import('@/lib/attestation-service');
    await createContractAttestations(contractId);
  } catch (attestError) {
    console.error('Attestation creation error:', attestError);
    // Non-fatal
  }

  return NextResponse.json(updated);
}
