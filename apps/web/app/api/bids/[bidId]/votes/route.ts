export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids, bidVotes, scopes, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Auth: must be member of the bid's squad OR the scope client
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

    let isClient = false;
    if (!membership) {
      // Check if scope client
      const [scope] = await db
        .select()
        .from(scopes)
        .where(eq(scopes.id, bid.scopeId))
        .limit(1);

      isClient = scope?.clientId === session.userId;
    }

    if (!membership && !isClient) {
      return NextResponse.json(
        { error: 'Only squad members or the scope client can view votes' },
        { status: 403 }
      );
    }

    // Fetch all votes with voter display names
    const votes = await db
      .select({
        id: bidVotes.id,
        bidId: bidVotes.bidId,
        userId: bidVotes.userId,
        vote: bidVotes.vote,
        comment: bidVotes.comment,
        votedAt: bidVotes.votedAt,
        voterDisplayName: users.displayName,
        voterEmail: users.email,
      })
      .from(bidVotes)
      .leftJoin(users, eq(bidVotes.userId, users.id))
      .where(eq(bidVotes.bidId, bidId));

    // Compute summary
    const approveCount = votes.filter((v) => v.vote === 'approve').length;
    const rejectCount = votes.filter((v) => v.vote === 'reject').length;
    const abstainCount = votes.filter((v) => v.vote === 'abstain').length;

    return NextResponse.json({
      votes,
      summary: {
        approve: approveCount,
        reject: rejectCount,
        abstain: abstainCount,
        total: votes.length,
      },
    });
  } catch (error) {
    console.error('Get votes error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
