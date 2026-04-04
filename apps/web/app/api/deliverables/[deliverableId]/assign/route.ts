export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, deliverables, contracts, squadMembers, users, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ deliverableId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { deliverableId } = await params;
  const body = await req.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId field' }, { status: 400 });
  }

  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);

  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found' }, { status: 404 });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, deliverable.contractId))
    .limit(1);

  if (!contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  }

  // Auth: the requesting user must be a squad member of the contract's squad
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, session.userId)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: must be a squad member' }, { status: 403 });
  }

  // The target userId must also be a squad member
  const [targetMembership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, userId)
      )
    )
    .limit(1);

  if (!targetMembership) {
    return NextResponse.json({ error: 'Target user is not a squad member' }, { status: 422 });
  }

  // Assign the deliverable
  const [updated] = await db
    .update(deliverables)
    .set({ assignedMemberId: userId, updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  // Resolve assignee name for response
  const [user] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const assigneeName = user?.displayName || user?.email || 'Unknown';

  // Log activity
  await db.insert(activityLog).values({
    contractId: deliverable.contractId,
    actorUserId: session.userId,
    action: 'deliverable_assigned',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: { title: deliverable.title, assignedTo: assigneeName },
  });

  return NextResponse.json({ ...updated, assignee: assigneeName });
}
