export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

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

  return NextResponse.json(bid);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  // Verify ownership and draft status
  const [existing] = await db
    .select()
    .from(bids)
    .where(
      and(
        eq(bids.id, bidId),
        eq(bids.createdById, session.userId)
      )
    )
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Can only edit bids in draft status' }, { status: 400 });
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
