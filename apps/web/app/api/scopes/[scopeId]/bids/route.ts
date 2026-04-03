export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, bids, scopes, squadMembers, squads } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scopeId } = await params;

  try {
    const body = await req.json();

    // Validate scope exists and is open
    const [scope] = await db
      .select()
      .from(scopes)
      .where(eq(scopes.id, scopeId))
      .limit(1);

    if (!scope) return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    if (scope.status !== 'open') {
      return NextResponse.json({ error: 'Scope is not open for bidding' }, { status: 400 });
    }

    // Validate user is a member of the specified squad
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, body.squadId),
          eq(squadMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json({ error: 'You are not a member of this squad' }, { status: 403 });
    }

    const [bid] = await db
      .insert(bids)
      .values({
        scopeId,
        squadId: body.squadId,
        createdById: session.userId,
        approach: body.approach,
        roleAssignments: body.roleAssignments,
        proposedTimeline: body.proposedTimeline,
        proposedPrice: body.proposedPrice,
        workPlanModifications: body.workPlanModifications,
        paymentSchedule: body.paymentSchedule,
        trackRecord: body.trackRecord,
        status: 'draft',
      })
      .returning();

    return NextResponse.json(bid, { status: 201 });
  } catch (error) {
    console.error('Create bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { scopeId } = await params;

  // Check if user is the scope client
  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, scopeId))
    .limit(1);

  if (!scope) return NextResponse.json({ error: 'Scope not found' }, { status: 404 });

  const isClient = scope.clientId === session.userId;

  if (isClient) {
    // Client sees all bids for this scope
    const allBids = await db
      .select({ bid: bids, squadName: squads.name, squadSlug: squads.slug })
      .from(bids)
      .innerJoin(squads, eq(squads.id, bids.squadId))
      .where(eq(bids.scopeId, scopeId))
      .orderBy(desc(bids.createdAt));

    return NextResponse.json(allBids.map(b => ({ ...b.bid, squadName: b.squadName, squadSlug: b.squadSlug })));
  } else {
    // Squad member sees only their squad's bids
    const userSquadIds = await db
      .select({ squadId: squadMembers.squadId })
      .from(squadMembers)
      .where(eq(squadMembers.userId, session.userId));

    if (userSquadIds.length === 0) return NextResponse.json([]);

    const userBids = await db
      .select({ bid: bids, squadName: squads.name, squadSlug: squads.slug })
      .from(bids)
      .innerJoin(squads, eq(squads.id, bids.squadId))
      .where(
        and(
          eq(bids.scopeId, scopeId),
          eq(bids.createdById, session.userId)
        )
      )
      .orderBy(desc(bids.createdAt));

    return NextResponse.json(userBids.map(b => ({ ...b.bid, squadName: b.squadName, squadSlug: b.squadSlug })));
  }
}
