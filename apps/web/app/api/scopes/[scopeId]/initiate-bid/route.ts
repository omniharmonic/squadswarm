export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db, scopes, bids, squads, squadMembers, users, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { meetsThreshold, getThresholdGap, TRUST_THRESHOLDS } from '@/lib/trust-threshold';

/**
 * POST /api/scopes/[scopeId]/initiate-bid
 * Creates a new bid in 'forming' status for collaborative deliverable claiming.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scopeId } = await params;

  try {
    const body = await req.json();
    const { squadId } = body;

    if (!squadId) {
      return NextResponse.json({ error: 'squadId is required' }, { status: 400 });
    }

    // Verify scope exists and is open for bidding
    const [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.id, scopeId))
      .limit(1);

    if (!scope) return NextResponse.json({ error: 'Scope not found' }, { status: 404 });

    if (scope.status !== 'open') {
      return NextResponse.json(
        { error: `Scope is not open for bidding, currently: ${scope.status}` },
        { status: 400 }
      );
    }

    // Check bidding deadline
    if (scope.biddingDeadline && new Date() > scope.biddingDeadline) {
      return NextResponse.json({ error: 'Bidding deadline has passed' }, { status: 400 });
    }

    // Verify user is a member of the specified squad
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadId),
          eq(squadMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: 'You must be a member of the squad to initiate a bid' },
        { status: 403 }
      );
    }

    // Enforce trust threshold
    const threshold = scope.trustThreshold || 'open';
    if (threshold !== 'open') {
      const [squad] = await db
        .select({ trustScore: squads.trustScore })
        .from(squads)
        .where(eq(squads.id, squadId))
        .limit(1);

      const squadScore = squad?.trustScore ? Number(squad.trustScore) : 0;
      const { meets, gap, required } = getThresholdGap(squadScore, threshold);

      if (!meets) {
        const thresholdConfig = TRUST_THRESHOLDS[threshold] || TRUST_THRESHOLDS.open;
        return NextResponse.json(
          {
            error: 'Trust threshold not met',
            details: `This scope requires '${thresholdConfig.label}' status (trust score >= ${required}). Your squad's current trust score is ${squadScore}. Complete contracts and earn positive ratings to increase your score.`,
            squadScore,
            required,
            gap,
            threshold,
          },
          { status: 403 }
        );
      }
    }

    // Check if this squad already has an active bid on this scope
    const existingBids = await db
      .select()
      .from(bids)
      .where(
        and(
          eq(bids.scopeId, scopeId),
          eq(bids.squadId, squadId)
        )
      );

    const activeBid = existingBids.find(b =>
      b.status !== 'withdrawn' && b.status !== 'rejected'
    );

    if (activeBid) {
      return NextResponse.json(
        {
          error: 'This squad already has an active bid on this scope',
          existingBidId: activeBid.id,
        },
        { status: 409 }
      );
    }

    // Create bid in forming status
    const [newBid] = await db
      .insert(bids)
      .values({
        scopeId,
        squadId,
        createdById: session.userId,
        status: 'forming',
        treasuryShareBps: 2000, // Default 20% to squad treasury
      })
      .returning();

    if (!newBid) return NextResponse.json({ error: 'Failed to create bid' }, { status: 500 });

    // Notify all squad members
    const otherMembers = await db
      .select({ userId: squadMembers.userId })
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadId),
          ne(squadMembers.userId, session.userId)
        )
      );

    if (otherMembers.length > 0) {
      const [initiator] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      const initiatorName = initiator?.displayName || 'A squad member';

      await db.insert(notifications).values(
        otherMembers.map(m => ({
          userId: m.userId,
          type: 'bid_initiated',
          title: `New bid started on "${scope.title}"`,
          body: `${initiatorName} wants to bid on "${scope.title}" — claim your deliverables!`,
          metadata: {
            bidId: newBid.id,
            scopeId,
            squadId,
            scopeTitle: scope.title,
          },
        }))
      );
    }

    console.log(`[Activity] bid_initiated: scope=${scopeId} squad=${squadId} by user=${session.userId} bid=${newBid.id}`);

    return NextResponse.json({
      ...newBid,
      redirectUrl: `/squads/${squadId}/bids/${newBid.id}/collaborate`,
    });
  } catch (error) {
    console.error('Initiate bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
