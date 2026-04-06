export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db, bids, bidAssignments, squads, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { notifyMany } from '@/lib/notify';

interface GovernanceModel {
  type: 'consent' | 'majority' | 'delegated';
  threshold?: number;
}

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
        { error: 'Only the bid creator or a squad admin can submit for review' },
        { status: 403 }
      );
    }

    // Bid must be in draft status
    if (bid.status !== 'draft') {
      return NextResponse.json(
        { error: `Bid must be in draft status to submit for review, currently: ${bid.status}` },
        { status: 400 }
      );
    }

    // Check for assignments (optional for scopes without work plans)
    const assignments = await db
      .select()
      .from(bidAssignments)
      .where(eq(bidAssignments.bidId, bidId));

    // Validate: bid has approach and proposedPrice
    if (!bid.approach) {
      return NextResponse.json(
        { error: 'Bid must have an approach defined' },
        { status: 400 }
      );
    }
    if (!bid.proposedPrice) {
      return NextResponse.json(
        { error: 'Bid must have a proposed price' },
        { status: 400 }
      );
    }

    // Fetch squad governance model
    const [squad] = await db
      .select()
      .from(squads)
      .where(eq(squads.id, bid.squadId))
      .limit(1);

    if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 });

    const governance = squad.governanceModel as GovernanceModel;

    // Count total squad members
    const allMembers = await db
      .select({ userId: squadMembers.userId, role: squadMembers.role })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, bid.squadId));

    const otherMembers = allMembers.filter(m => m.userId !== session.userId);
    const isSoloSquad = allMembers.length <= 1;
    const isAdminDelegated = governance.type === 'delegated' && isAdmin;

    // Solo squads or delegated-admin: auto-ratify (no vote needed)
    if (isSoloSquad || isAdminDelegated) {
      const [updated] = await db
        .update(bids)
        .set({
          status: 'ratified',
          governanceStatus: 'ratified',
          ratifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bidId))
        .returning();

      console.log(`[Activity] bid_auto_ratified: bid=${bidId} (${isSoloSquad ? 'solo squad' : 'delegated admin'})`);
      return NextResponse.json({ ...updated, autoRatified: true });
    }

    // Set governance deadline based on model type
    let governanceDeadline: Date | null = null;
    const now = new Date();

    switch (governance.type) {
      case 'consent':
        governanceDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours
        break;
      case 'majority':
        governanceDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours
        break;
      case 'delegated':
        governanceDeadline = null; // No deadline — instant if lead approves
        break;
      default:
        governanceDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000); // Default 48h
    }

    // Update bid status
    const [updated] = await db
      .update(bids)
      .set({
        status: 'under_review',
        governanceStatus: 'pending',
        governanceDeadline,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, bidId))
      .returning();

    // Notify all squad members except the submitter
    const members = otherMembers;

    // Get submitter display name for notification
    const [submitter] = await db
      .select({ displayName: users.displayName })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    const submitterName = submitter?.displayName || 'A squad member';

    if (members.length > 0) {
      await notifyMany(
        members.map((m) => m.userId),
        {
          type: 'bid_review_requested',
          title: 'Bid submitted for review',
          body: `${submitterName} submitted a bid for governance review. Your vote is needed.`,
          metadata: {
            bidId,
            squadId: bid.squadId,
            scopeId: bid.scopeId,
          },
        }
      );
    }

    // Activity logging note: activityLog requires contractId (NOT NULL),
    // which doesn't exist at bid phase. Status change is tracked on the bid itself.
    console.log(`[Activity] bid_submitted_for_review: bid=${bidId} by user=${session.userId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Submit for review error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
