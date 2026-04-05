export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db, bids, bidClaims, squadMembers, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/bids/[bidId]/claims/[claimId]/resolve
 * Resolve a contested claim — marks this claim as resolved and others as withdrawn.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string; claimId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId, claimId } = await params;

  try {
    // Fetch the claim
    const [claim] = await db
      .select()
      .from(bidClaims)
      .where(
        and(
          eq(bidClaims.id, claimId),
          eq(bidClaims.bidId, bidId)
        )
      )
      .limit(1);

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Auth: must be squad admin or the claimant themselves
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, bid.squadId),
          eq(squadMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: 'Only squad members can resolve claims' },
        { status: 403 }
      );
    }

    const isAdmin = membership.role === 'admin';
    let isClaimant = claim.userId === session.userId;

    if (!isClaimant && claim.agentId) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, claim.agentId))
        .limit(1);

      isClaimant = agent?.ownerId === session.userId;
    }

    if (!isAdmin && !isClaimant) {
      return NextResponse.json(
        { error: 'Only a squad admin or the claimant can resolve a claim' },
        { status: 403 }
      );
    }

    if (claim.status === 'withdrawn') {
      return NextResponse.json({ error: 'Cannot resolve a withdrawn claim' }, { status: 400 });
    }

    if (claim.status === 'resolved') {
      return NextResponse.json({ error: 'Claim is already resolved' }, { status: 400 });
    }

    // Optional BPS adjustment
    let body: { proposedBps?: number } = {};
    try {
      body = await req.json();
    } catch {
      // No body provided — that's fine
    }

    const updateData: Record<string, unknown> = {
      status: 'resolved',
      updatedAt: new Date(),
    };

    if (body.proposedBps !== undefined) {
      if (typeof body.proposedBps !== 'number' || body.proposedBps < 0 || body.proposedBps > 10000) {
        return NextResponse.json(
          { error: 'proposedBps must be a number between 0 and 10000' },
          { status: 400 }
        );
      }
      updateData.proposedBps = body.proposedBps;
    }

    // Resolve this claim
    const [resolved] = await db
      .update(bidClaims)
      .set(updateData)
      .where(eq(bidClaims.id, claimId))
      .returning();

    // Withdraw other contested claims on the same deliverable
    await db
      .update(bidClaims)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(
        and(
          eq(bidClaims.bidId, bidId),
          eq(bidClaims.deliverableKey, claim.deliverableKey),
          ne(bidClaims.id, claimId),
          ne(bidClaims.status, 'withdrawn')
        )
      );

    console.log(`[Activity] claim_resolved: bid=${bidId} claim=${claimId} deliverable=${claim.deliverableKey} by=${session.userId}`);

    return NextResponse.json(resolved);
  } catch (error) {
    console.error('Resolve claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
