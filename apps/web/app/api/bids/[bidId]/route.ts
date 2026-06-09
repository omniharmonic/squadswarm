export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getBidViewerRole, redactBidForClient } from '@/lib/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.id, bidId))
    .limit(1);

  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  // Only the bidding squad's members or the scope's client may view a bid.
  // Until bidding closes, the client sees a redacted view (no competitor
  // pricing/approach); the bidding squad sees the full bid.
  const viewerRole = await getBidViewerRole(session.userId, bid);
  if (!viewerRole) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  if (viewerRole === 'scope_client' && bid.status !== 'accepted') {
    return NextResponse.json(redactBidForClient(bid));
  }

  return NextResponse.json(bid);
}

const EDITABLE_STATUSES = ['draft', 'forming', 'changes_requested'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  // Fetch the bid
  const [existing] = await db
    .select()
    .from(bids)
    .where(eq(bids.id, bidId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  // Allow editing in draft, forming, or changes_requested
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    return NextResponse.json({ error: `Cannot edit bid in '${existing.status}' status` }, { status: 400 });
  }

  // Verify the user is a squad member (not just the creator)
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, existing.squadId), eq(squadMembers.userId, session.userId)))
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Only squad members can edit this bid' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const allowedFields: Record<string, unknown> = {};

    if (body.approach !== undefined) allowedFields.approach = body.approach;
    if (body.roleAssignments !== undefined) allowedFields.roleAssignments = body.roleAssignments;
    if (body.proposedTimeline !== undefined) allowedFields.proposedTimeline = body.proposedTimeline;
    if (body.proposedPrice !== undefined) allowedFields.proposedPrice = body.proposedPrice;
    if (body.workPlanModifications !== undefined) allowedFields.workPlanModifications = body.workPlanModifications;
    if (body.paymentSchedule !== undefined) allowedFields.paymentSchedule = body.paymentSchedule;
    if (body.trackRecord !== undefined) allowedFields.trackRecord = body.trackRecord;
    if (body.status !== undefined) allowedFields.status = body.status;
    if (body.treasuryShareBps !== undefined) allowedFields.treasuryShareBps = body.treasuryShareBps;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    allowedFields.updatedAt = new Date();

    const [updated] = await db
      .update(bids)
      .set(allowedFields)
      .where(eq(bids.id, bidId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
