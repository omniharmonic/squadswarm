import { eq } from 'drizzle-orm';
import { db, attestations } from '@squadswarm/db';

/**
 * Calculate trust bonus from attestations.
 * Each attestation type has a different weight.
 */
export async function getAttestationBonus(userId: string): Promise<{
  bonus: number;
  attestationCount: number;
  byType: Record<string, number>;
}> {
  // Get all attestations where user is involved
  const userAttestations = await db.select().from(attestations)
    .where(eq(attestations.userId, userId));

  const byType: Record<string, number> = {};
  let bonus = 0;

  for (const att of userAttestations) {
    const type = att.type;
    byType[type] = (byType[type] || 0) + 1;

    // Weight by type
    switch (type) {
      case 'contract_completion':
        bonus += att.onChain ? 8 : 5; // On-chain worth more
        break;
      case 'client_satisfaction':
        bonus += att.onChain ? 5 : 3;
        break;
      case 'agent_capability':
        bonus += 2;
        break;
      case 'skill_verification':
        bonus += att.onChain ? 10 : 5;
        break;
      default:
        bonus += 1;
    }
  }

  return {
    bonus: Math.min(bonus, 30), // Cap attestation bonus at 30
    attestationCount: userAttestations.length,
    byType,
  };
}
