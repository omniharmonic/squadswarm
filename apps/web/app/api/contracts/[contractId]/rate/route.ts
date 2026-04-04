export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, contracts, activityLog, squads, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

interface RatingPayload {
  overall: number;
  quality: number;
  communication: number;
  timeliness: number;
  wouldRehire: boolean;
  feedback?: string;
}

function isValidRating(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * Recalculate trust scores for a squad and its members, factoring in ratings.
 * Formula: base 50 + bio 10 + squads (5 each, max 20) + completed contracts (10 each) + rating adjustments (+5 per 4-5 star, -5 per 1-2 star). Capped at [0, 100].
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
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Fetch contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Only the client can rate
  if (contract.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the client can rate a contract' }, { status: 403 });
  }

  // Contract must be completed
  if (contract.status !== 'completed') {
    return NextResponse.json({ error: 'Contract must be completed to rate' }, { status: 400 });
  }

  // Check if already rated
  const existingRating = await db
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.contractId, contractId),
        eq(activityLog.action, 'contract_rated')
      )
    )
    .limit(1);

  if (existingRating.length > 0) {
    return NextResponse.json({ error: 'Contract already rated' }, { status: 409 });
  }

  // Validate body
  const body = (await req.json()) as RatingPayload;
  const { overall, quality, communication, timeliness, wouldRehire, feedback } = body;

  if (!isValidRating(overall) || !isValidRating(quality) || !isValidRating(communication) || !isValidRating(timeliness)) {
    return NextResponse.json({ error: 'Ratings must be integers between 1 and 5' }, { status: 400 });
  }

  if (typeof wouldRehire !== 'boolean') {
    return NextResponse.json({ error: 'wouldRehire must be a boolean' }, { status: 400 });
  }

  // Store rating in activity_log
  const [entry] = await db
    .insert(activityLog)
    .values({
      contractId,
      actorUserId: session.userId,
      action: 'contract_rated',
      entityType: 'contract',
      entityId: contractId,
      metadata: {
        overall,
        quality,
        communication,
        timeliness,
        wouldRehire,
        feedback: feedback || null,
      },
    })
    .returning() as [typeof activityLog.$inferSelect];

  // Trigger trust score recalculation after rating
  try {
    await recalculateTrustScores(contract.squadId);
  } catch (error) {
    console.error('Trust score recalculation after rating failed:', error);
    // Non-fatal — don't fail the rating submission
  }

  return NextResponse.json({
    id: entry?.id,
    overall,
    quality,
    communication,
    timeliness,
    wouldRehire,
    feedback: feedback || null,
    createdAt: entry?.createdAt,
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  const [entry] = await db
    .select()
    .from(activityLog)
    .where(
      and(
        eq(activityLog.contractId, contractId),
        eq(activityLog.action, 'contract_rated')
      )
    )
    .limit(1);

  if (!entry) {
    return NextResponse.json({ rating: null });
  }

  const meta = entry.metadata as Record<string, unknown>;
  return NextResponse.json({
    rating: {
      id: entry.id,
      overall: meta.overall,
      quality: meta.quality,
      communication: meta.communication,
      timeliness: meta.timeliness,
      wouldRehire: meta.wouldRehire,
      feedback: meta.feedback,
      createdAt: entry.createdAt,
    },
  });
}
