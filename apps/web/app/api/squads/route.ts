export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, squads, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const [squad] = await db
      .insert(squads)
      .values({
        name: body.name,
        slug: slug + '-' + Date.now().toString(36),
        bio: body.bio,
        missionStatement: body.missionStatement,
        governanceModel: body.governanceModel || { model: 'consent' },
        revenueSplitDefault: body.revenueSplitDefault || { type: 'equal' },
        paymentMode: body.paymentMode || 'fiat',
      })
      .returning();

    if (!squad) throw new Error('Failed to create squad');

    // Add creator as admin member
    await db.insert(squadMembers).values({
      squadId: squad!.id,
      userId: session.userId,
      role: 'admin',
      permissions: { submit_bid: true, manage_members: true, manage_governance: true },
    });

    return NextResponse.json(squad, { status: 201 });
  } catch (error) {
    console.error('Create squad error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all squads where the user is a member
  const memberships = await db
    .select({ squad: squads, membership: squadMembers })
    .from(squadMembers)
    .innerJoin(squads, eq(squads.id, squadMembers.squadId))
    .where(eq(squadMembers.userId, session.userId))
    .orderBy(desc(squads.createdAt));

  return NextResponse.json(memberships.map(m => ({ ...m.squad, role: m.membership.role })));
}
