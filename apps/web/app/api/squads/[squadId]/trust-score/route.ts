export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, squads, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { calculateTrustScore } from '@/lib/trust-calculator';
import { getAllThresholdStatuses } from '@/lib/trust-threshold';

/**
 * GET /api/squads/[squadId]/trust-score
 * Returns detailed trust score breakdown for a squad, including per-member scores
 * and threshold eligibility status.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  try {
    // Verify squad exists
    const [squad] = await db
      .select()
      .from(squads)
      .where(eq(squads.id, squadId))
      .limit(1);

    if (!squad) {
      return NextResponse.json({ error: 'Squad not found' }, { status: 404 });
    }

    // Get all members
    const members = await db
      .select({
        userId: squadMembers.userId,
        displayName: users.displayName,
        trustScore: users.trustScore,
      })
      .from(squadMembers)
      .innerJoin(users, eq(users.id, squadMembers.userId))
      .where(eq(squadMembers.squadId, squadId));

    // Calculate individual member scores for breakdown
    const memberScores = await Promise.all(
      members.map(async (m) => {
        const { score, breakdown } = await calculateTrustScore(m.userId);
        return {
          userId: m.userId,
          displayName: m.displayName || 'Unknown',
          trustScore: score,
          breakdown,
        };
      })
    );

    const squadScore = squad.trustScore ? Number(squad.trustScore) : 0;

    // Aggregate breakdown from member scores
    const avgBreakdown = {
      baseScore: 0,
      memberContributions: 0,
      completedContracts: 0,
      ratings: 0,
    };

    if (memberScores.length > 0) {
      for (const ms of memberScores) {
        avgBreakdown.baseScore += ms.breakdown.base || 0;
        avgBreakdown.memberContributions += (ms.breakdown.bio || 0) + (ms.breakdown.squads || 0);
        avgBreakdown.completedContracts += (ms.breakdown.squadContracts || 0) + (ms.breakdown.clientContracts || 0);
        avgBreakdown.ratings += ms.breakdown.ratings || 0;
      }
      const count = memberScores.length;
      avgBreakdown.baseScore = Math.round(avgBreakdown.baseScore / count);
      avgBreakdown.memberContributions = Math.round(avgBreakdown.memberContributions / count);
      avgBreakdown.completedContracts = Math.round(avgBreakdown.completedContracts / count);
      avgBreakdown.ratings = Math.round(avgBreakdown.ratings / count);
    }

    const thresholdStatus = getAllThresholdStatuses(squadScore);

    return NextResponse.json({
      squadId,
      trustScore: squadScore,
      breakdown: avgBreakdown,
      thresholdStatus,
      memberScores: memberScores.map(({ userId, displayName, trustScore }) => ({
        userId,
        displayName,
        trustScore,
      })),
    });
  } catch (error) {
    console.error('Trust score fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
