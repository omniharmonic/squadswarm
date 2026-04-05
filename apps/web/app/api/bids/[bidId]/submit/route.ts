export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids, scopes, squads, squadMembers, users, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
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

    // Auth: must be bid creator or squad admin
    const isCreator = bid.createdById === session.userId;

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

    const isAdmin = membership?.role === 'admin';

    if (!isCreator && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the bid creator or a squad admin can submit the bid' },
        { status: 403 }
      );
    }

    // Bid must be in ratified status
    if (bid.status !== 'ratified') {
      return NextResponse.json(
        { error: `Bid must be ratified before submitting to client, currently: ${bid.status}` },
        { status: 400 }
      );
    }

    // Update bid status to submitted
    const [updated] = await db
      .update(bids)
      .set({
        status: 'submitted',
        submittedById: session.userId,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, bidId))
      .returning();

    // Fetch scope to notify the client
    const [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.id, bid.scopeId))
      .limit(1);

    if (scope) {
      // Get squad name for the notification
      const [squad] = await db
        .select({ name: squads.name })
        .from(squads)
        .where(eq(squads.id, bid.squadId))
        .limit(1);

      const squadName = squad?.name || 'A squad';

      await db.insert(notifications).values({
        userId: scope.clientId,
        type: 'bid_submitted',
        title: 'New bid received',
        body: `${squadName} has submitted a bid for "${scope.title}".`,
        metadata: {
          bidId,
          squadId: bid.squadId,
          scopeId: bid.scopeId,
          squadName,
        },
      });
    }

    console.log(`[Activity] bid_submitted: bid=${bidId} by user=${session.userId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Submit bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
