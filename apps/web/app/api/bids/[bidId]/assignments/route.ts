export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, bids, bidAssignments, squadMembers, users, agents } from '@squadswarm/db';
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

    // Auth: must be member of the bid's squad
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
        { error: 'Only squad members can view bid assignments' },
        { status: 403 }
      );
    }

    // Fetch assignments with user/agent display names
    const assignments = await db
      .select({
        id: bidAssignments.id,
        bidId: bidAssignments.bidId,
        deliverableKey: bidAssignments.deliverableKey,
        userId: bidAssignments.userId,
        agentId: bidAssignments.agentId,
        roleTitle: bidAssignments.roleTitle,
        paymentShareBps: bidAssignments.paymentShareBps,
        note: bidAssignments.note,
        createdAt: bidAssignments.createdAt,
        userDisplayName: users.displayName,
        userEmail: users.email,
        agentName: agents.name,
      })
      .from(bidAssignments)
      .leftJoin(users, eq(bidAssignments.userId, users.id))
      .leftJoin(agents, eq(bidAssignments.agentId, agents.id))
      .where(eq(bidAssignments.bidId, bidId));

    return NextResponse.json({
      assignments,
      treasuryShareBps: bid.treasuryShareBps,
      totalAssignedBps: assignments.reduce((sum, a) => sum + a.paymentShareBps, 0),
    });
  } catch (error) {
    console.error('Get assignments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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
        { error: 'Only the bid creator or a squad admin can manage assignments' },
        { status: 403 }
      );
    }

    // Bid must be in draft or under_review status
    if (bid.status !== 'draft' && bid.status !== 'under_review') {
      return NextResponse.json(
        { error: `Can only edit assignments when bid is in draft or under_review status, currently: ${bid.status}` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const inputAssignments = body.assignments;

    if (!Array.isArray(inputAssignments) || inputAssignments.length === 0) {
      return NextResponse.json(
        { error: 'Assignments array is required and must not be empty' },
        { status: 400 }
      );
    }

    // Validate each assignment
    for (const a of inputAssignments) {
      if (!a.deliverableKey || typeof a.deliverableKey !== 'string') {
        return NextResponse.json(
          { error: 'Each assignment must have a deliverableKey (string)' },
          { status: 400 }
        );
      }
      if (typeof a.paymentShareBps !== 'number' || a.paymentShareBps < 0) {
        return NextResponse.json(
          { error: 'Each assignment must have a non-negative paymentShareBps (number)' },
          { status: 400 }
        );
      }
    }

    // Validate: total paymentShareBps + treasuryShareBps <= 10000
    const totalAssignedBps = inputAssignments.reduce(
      (sum: number, a: { paymentShareBps: number }) => sum + a.paymentShareBps,
      0
    );
    const treasuryBps = bid.treasuryShareBps ?? 2000;

    if (totalAssignedBps + treasuryBps > 10000) {
      return NextResponse.json(
        {
          error: `Total payment shares (${totalAssignedBps} bps) plus treasury share (${treasuryBps} bps) exceeds 10000 bps`,
        },
        { status: 400 }
      );
    }

    // Delete existing assignments for this bid
    await db
      .delete(bidAssignments)
      .where(eq(bidAssignments.bidId, bidId));

    // Insert new assignments
    const created = await db
      .insert(bidAssignments)
      .values(
        inputAssignments.map((a: {
          deliverableKey: string;
          userId?: string;
          agentId?: string;
          roleTitle?: string;
          paymentShareBps: number;
          note?: string;
        }) => ({
          bidId,
          deliverableKey: a.deliverableKey,
          userId: a.userId || null,
          agentId: a.agentId || null,
          roleTitle: a.roleTitle || null,
          paymentShareBps: a.paymentShareBps,
          note: a.note || null,
        }))
      )
      .returning();

    return NextResponse.json({
      assignments: created,
      totalAssignedBps,
      treasuryShareBps: treasuryBps,
    });
  } catch (error) {
    console.error('Update assignments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
