export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getSquadRole } from '@/lib/access';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  // Only squad members can view the roster.
  const role = await getSquadRole(session.userId, squadId);
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const rows = await db
    .select({
      id: squadMembers.id,
      userId: squadMembers.userId,
      role: squadMembers.role,
      permissions: squadMembers.permissions,
      joinedAt: squadMembers.joinedAt,
      userName: users.displayName,
      userEmail: users.email,
      userAvatarUrl: users.avatarUrl,
    })
    .from(squadMembers)
    .innerJoin(users, eq(users.id, squadMembers.userId))
    .where(eq(squadMembers.squadId, squadId));

  // Member email addresses are PII — only admins see them.
  const members = rows.map((m) => (role === 'admin' ? m : { ...m, userEmail: null }));

  return NextResponse.json(members);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  // Check admin permission
  const [adminMembership] = await db
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

  if (!adminMembership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();

    let targetUserId = body.userId;

    // If email is provided instead of userId, look up the user
    if (!targetUserId && body.email) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, body.email))
        .limit(1);

      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      targetUserId = user.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'userId or email is required' }, { status: 400 });
    }

    // Check if already a member
    const [existing] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, squadId),
          eq(squadMembers.userId, targetUserId)
        )
      )
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: 'User is already a member of this squad' }, { status: 409 });
    }

    const [member] = await db
      .insert(squadMembers)
      .values({
        squadId,
        userId: targetUserId,
        role: body.role || 'member',
        permissions: body.permissions || { submit_bid: false, manage_members: false, manage_governance: false },
      })
      .returning();

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Add squad member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
