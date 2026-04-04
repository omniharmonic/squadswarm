export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, and, count } from 'drizzle-orm';
import { db, users, squadMembers, contracts, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // 1. Count squad memberships
  const [squadCount] = await db
    .select({ count: count() })
    .from(squadMembers)
    .where(eq(squadMembers.userId, session.userId));

  const squadMemberships = squadCount?.count ?? 0;

  // 2. Get squads user belongs to, then count completed contracts for those squads
  const userSquads = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .where(eq(squadMembers.userId, session.userId));

  const squadIds = userSquads.map((s) => s.squadId);

  let completedAsSquadMember = 0;
  for (const squadId of squadIds) {
    const [result] = await db
      .select({ count: count() })
      .from(contracts)
      .where(and(eq(contracts.squadId, squadId), eq(contracts.status, 'completed')));
    completedAsSquadMember += result?.count ?? 0;
  }

  // 3. Count completed contracts where user was client
  const [clientContracts] = await db
    .select({ count: count() })
    .from(contracts)
    .where(and(eq(contracts.clientId, session.userId), eq(contracts.status, 'completed')));

  const completedAsClient = clientContracts?.count ?? 0;

  // 4. Check if bio is set
  const hasBio = !!user.bio && user.bio.trim().length > 0;

  // 5. Gather ratings for contracts involving user's squads
  let positiveRatings = 0;
  let negativeRatings = 0;

  for (const squadId of squadIds) {
    const squadContracts = await db
      .select({ id: contracts.id })
      .from(contracts)
      .where(and(eq(contracts.squadId, squadId), eq(contracts.status, 'completed')));

    for (const sc of squadContracts) {
      const [ratingEntry] = await db
        .select()
        .from(activityLog)
        .where(
          and(
            eq(activityLog.contractId, sc.id),
            eq(activityLog.action, 'contract_rated')
          )
        )
        .limit(1);

      if (ratingEntry) {
        const meta = ratingEntry.metadata as Record<string, unknown>;
        const overall = Number(meta.overall);
        if (overall >= 4) positiveRatings++;
        else if (overall <= 2) negativeRatings++;
      }
    }
  }

  const ratingBonus = positiveRatings * 5 - negativeRatings * 5;

  // Calculate score
  const baseScore = 50;
  const bioBonus = hasBio ? 10 : 0;
  const squadBonus = Math.min(squadMemberships * 5, 20);
  const squadContractBonus = completedAsSquadMember * 10;
  const clientContractBonus = completedAsClient * 5;

  const rawScore = baseScore + bioBonus + squadBonus + squadContractBonus + clientContractBonus + ratingBonus;
  const trustScore = Math.max(0, Math.min(rawScore, 100));

  // Update DB
  await db
    .update(users)
    .set({ trustScore: trustScore.toString(), updatedAt: new Date() })
    .where(eq(users.id, session.userId));

  return NextResponse.json({
    trustScore,
    breakdown: {
      base: baseScore,
      bio: bioBonus,
      squads: squadBonus,
      squadContracts: squadContractBonus,
      clientContracts: clientContractBonus,
      ratings: ratingBonus,
    },
    details: {
      hasBio,
      squadMemberships,
      completedAsSquadMember,
      completedAsClient,
      positiveRatings,
      negativeRatings,
    },
  });
}
