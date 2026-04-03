export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, squads, squadMembers, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  const [squad] = await db
    .select()
    .from(squads)
    .where(eq(squads.id, squadId))
    .limit(1);

  if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 });

  const [membersCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  // Count agents owned by squad members
  const memberIds = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  let agentCount = 0;
  if (memberIds.length > 0) {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(
        sql`${agents.ownerId} IN (${sql.join(
          memberIds.map(m => sql`${m.userId}`),
          sql`, `
        )})`
      );
    agentCount = result?.count ?? 0;
  }

  return NextResponse.json({
    ...squad,
    membersCount: membersCount?.count ?? 0,
    agentCount,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  // Check admin permission
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, squadId),
        eq(squadMembers.userId, session.userId),
        eq(squadMembers.role, 'admin')
      )
    )
    .limit(1);

  if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const allowedFields: Record<string, unknown> = {};

    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.bio !== undefined) allowedFields.bio = body.bio;
    if (body.missionStatement !== undefined) allowedFields.missionStatement = body.missionStatement;
    if (body.governanceModel !== undefined) allowedFields.governanceModel = body.governanceModel;
    if (body.revenueSplitDefault !== undefined) allowedFields.revenueSplitDefault = body.revenueSplitDefault;
    if (body.paymentMode !== undefined) allowedFields.paymentMode = body.paymentMode;
    if (body.avatarUrl !== undefined) allowedFields.avatarUrl = body.avatarUrl;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    allowedFields.updatedAt = new Date();

    const [updated] = await db
      .update(squads)
      .set(allowedFields)
      .where(eq(squads.id, squadId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update squad error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
