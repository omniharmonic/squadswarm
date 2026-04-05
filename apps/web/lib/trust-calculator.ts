import { eq, and } from 'drizzle-orm';
import { db, users, squads, squadMembers, contracts, activityLog } from '@squadswarm/db';

/**
 * Canonical trust score calculation.
 * This is the ONLY place the formula lives.
 */
export async function calculateTrustScore(userId: string): Promise<{
  score: number;
  breakdown: Record<string, number>;
}> {
  // 1. Base score
  const base = 50;

  // 2. Bio bonus
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const bioBonus = user?.bio ? 10 : 0;

  // 3. Squad memberships
  const memberships = await db.select().from(squadMembers).where(eq(squadMembers.userId, userId));
  const squadBonus = Math.min(memberships.length * 5, 20);

  // 4. Completed contracts as squad member
  const squadIds = memberships.map(m => m.squadId);
  let squadContractBonus = 0;
  for (const sid of squadIds) {
    const completed = await db.select().from(contracts)
      .where(eq(contracts.squadId, sid));
    squadContractBonus += completed.filter(c => c.status === 'completed').length * 10;
  }

  // 5. Completed contracts as client
  const clientContracts = await db.select().from(contracts)
    .where(eq(contracts.clientId, userId));
  const clientContractBonus = clientContracts.filter(c => c.status === 'completed').length * 5;

  // 6. Rating bonus
  let positiveRatings = 0;
  let negativeRatings = 0;
  // Find ratings on contracts where user's squads were involved
  for (const sid of squadIds) {
    const squadContracts = await db.select().from(contracts)
      .where(eq(contracts.squadId, sid));
    for (const contract of squadContracts) {
      const ratings = await db.select().from(activityLog)
        .where(and(
          eq(activityLog.contractId, contract.id),
          eq(activityLog.action, 'contract_rated')
        ));
      const ratingEntry = ratings[0];
      if (ratingEntry) {
        const meta = ratingEntry.metadata as Record<string, number> | null;
        if (meta?.overall && meta.overall >= 4) positiveRatings++;
        if (meta?.overall && meta.overall <= 2) negativeRatings++;
      }
    }
  }
  const ratingBonus = positiveRatings * 5 - negativeRatings * 5;

  const rawScore = base + bioBonus + squadBonus + squadContractBonus + clientContractBonus + ratingBonus;
  const score = Math.max(0, Math.min(rawScore, 100));

  return {
    score,
    breakdown: {
      base,
      bio: bioBonus,
      squads: squadBonus,
      squadContracts: squadContractBonus,
      clientContracts: clientContractBonus,
      ratings: ratingBonus,
    },
  };
}

/**
 * Recalculate and persist trust scores for a squad and all its members.
 */
export async function recalculateSquadTrustScores(squadId: string): Promise<void> {
  // Get all members
  const members = await db.select().from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  // Recalculate for each member
  for (const member of members) {
    const { score } = await calculateTrustScore(member.userId);
    await db.update(users)
      .set({ trustScore: String(score), updatedAt: new Date() })
      .where(eq(users.id, member.userId));
  }

  // Calculate squad score as average of member scores
  const memberScores = await Promise.all(
    members.map(async m => {
      const { score } = await calculateTrustScore(m.userId);
      return score;
    })
  );
  const avgScore = memberScores.length > 0
    ? Math.round(memberScores.reduce((a, b) => a + b, 0) / memberScores.length)
    : 50;

  await db.update(squads)
    .set({ trustScore: String(avgScore), updatedAt: new Date() })
    .where(eq(squads.id, squadId));
}
