export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids, bidVotes, scopes, squads, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all squads the user belongs to
  const userSquads = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .where(eq(squadMembers.userId, session.userId));

  if (userSquads.length === 0) return NextResponse.json([]);

  const pendingBids: {
    bidId: string;
    scopeTitle: string;
    squadName: string;
    proposedPrice: string | null;
    createdAt: string;
    governanceDeadline: string | null;
    voteUrl: string;
  }[] = [];

  for (const { squadId } of userSquads) {
    // Find bids under_review for this squad
    const underReviewBids = await db
      .select()
      .from(bids)
      .where(and(eq(bids.squadId, squadId), eq(bids.status, 'under_review')));

    for (const bid of underReviewBids) {
      // Check if this user has already voted
      const [existingVote] = await db
        .select()
        .from(bidVotes)
        .where(and(eq(bidVotes.bidId, bid.id), eq(bidVotes.userId, session.userId)))
        .limit(1);

      if (existingVote) continue; // Already voted

      // Get scope title
      const [scope] = await db
        .select({ title: scopes.title })
        .from(scopes)
        .where(eq(scopes.id, bid.scopeId))
        .limit(1);

      // Get squad name
      const [squad] = await db
        .select({ name: squads.name })
        .from(squads)
        .where(eq(squads.id, squadId))
        .limit(1);

      pendingBids.push({
        bidId: bid.id,
        scopeTitle: scope?.title || 'Unknown Scope',
        squadName: squad?.name || 'Unknown Squad',
        proposedPrice: bid.proposedPrice,
        createdAt: bid.createdAt.toISOString(),
        governanceDeadline: bid.governanceDeadline?.toISOString() || null,
        voteUrl: `/bids/${bid.id}/vote`,
      });
    }
  }

  return NextResponse.json(pendingBids);
}
