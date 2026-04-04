export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, contracts, squads, squadMembers, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Find squads the user belongs to
    const userSquadIds = await db
      .select({ squadId: squadMembers.squadId })
      .from(squadMembers)
      .where(eq(squadMembers.userId, session.userId));

    const squadIds = userSquadIds.map((s) => s.squadId);

    const allContracts = await db
      .select()
      .from(contracts)
      .orderBy(desc(contracts.createdAt));

    // Filter to contracts where user is client or squad member
    const userContracts = allContracts.filter(
      (c) => c.clientId === session.userId || squadIds.includes(c.squadId),
    );

    // Enrich with names
    const enriched = await Promise.all(
      userContracts.map(async (c) => {
        const [squad] = await db
          .select({ name: squads.name })
          .from(squads)
          .where(eq(squads.id, c.squadId))
          .limit(1);
        const [client] = await db
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, c.clientId))
          .limit(1);
        return {
          ...c,
          squadName: squad?.name || 'Unknown',
          clientName: client?.displayName || 'Unknown',
        };
      }),
    );

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Contracts list error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
