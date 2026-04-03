export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { db, squadMembers, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ squadId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { squadId } = await params;

  // Get all member user IDs for this squad
  const memberIds = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  if (memberIds.length === 0) {
    return NextResponse.json([]);
  }

  // Get all agents owned by these members
  const squadAgents = await db
    .select()
    .from(agents)
    .where(
      sql`${agents.ownerId} IN (${sql.join(
        memberIds.map(m => sql`${m.userId}`),
        sql`, `
      )})`
    );

  return NextResponse.json(squadAgents);
}
