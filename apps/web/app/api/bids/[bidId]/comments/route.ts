export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, isNull, asc } from 'drizzle-orm';
import { db, bids, bidComments, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/**
 * GET /api/bids/[bidId]/comments
 * Returns comments for a bid, optionally filtered by deliverableKey.
 */
export async function GET(
  req: NextRequest,
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

    // Auth: must be squad member
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
        { error: 'Only squad members can view comments' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const deliverableKeyParam = url.searchParams.get('deliverableKey');

    // Fetch comments with user display names
    let commentsQuery = db
      .select({
        id: bidComments.id,
        bidId: bidComments.bidId,
        deliverableKey: bidComments.deliverableKey,
        userId: bidComments.userId,
        content: bidComments.content,
        createdAt: bidComments.createdAt,
        userName: users.displayName,
        userEmail: users.email,
      })
      .from(bidComments)
      .leftJoin(users, eq(bidComments.userId, users.id))
      .where(eq(bidComments.bidId, bidId))
      .orderBy(asc(bidComments.createdAt))
      .$dynamic();

    const allComments = await commentsQuery;

    // Enrich with display names
    const enriched = allComments.map(c => ({
      id: c.id,
      bidId: c.bidId,
      deliverableKey: c.deliverableKey,
      userId: c.userId,
      userName: c.userName || c.userEmail?.split('@')[0] || 'Unknown',
      content: c.content,
      createdAt: c.createdAt,
    }));

    // Filter by deliverableKey if provided
    if (deliverableKeyParam !== null) {
      const filtered = enriched.filter(c => c.deliverableKey === deliverableKeyParam);
      return NextResponse.json({ comments: filtered });
    }

    // Group by deliverableKey (null = general)
    const grouped: Record<string, typeof enriched> = {};
    for (const comment of enriched) {
      const key = comment.deliverableKey ?? 'general';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(comment);
    }

    return NextResponse.json({ comments: enriched, grouped });
  } catch (error) {
    console.error('Get comments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/bids/[bidId]/comments
 * Add a comment to a bid, optionally scoped to a deliverable.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    const body = await req.json();
    const { content, deliverableKey } = body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required and must be non-empty' }, { status: 400 });
    }

    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Auth: must be squad member
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
        { error: 'Only squad members can comment' },
        { status: 403 }
      );
    }

    // Insert comment
    const [comment] = await db
      .insert(bidComments)
      .values({
        bidId,
        deliverableKey: deliverableKey !== undefined ? String(deliverableKey) : null,
        userId: session.userId,
        content: content.trim(),
      })
      .returning();

    // Get user info for response
    const [user] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    console.log(`[Activity] bid_comment: bid=${bidId} deliverable=${deliverableKey ?? 'general'} user=${session.userId}`);

    return NextResponse.json({
      ...comment,
      userName: user?.displayName || user?.email?.split('@')[0] || 'Unknown',
    });
  } catch (error) {
    console.error('Create comment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
