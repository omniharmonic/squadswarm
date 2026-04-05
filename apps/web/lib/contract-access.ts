import { eq, and } from 'drizzle-orm';
import { db, contracts, squadMembers } from '@squadswarm/db';

export type ContractRole = 'client' | 'squad_admin' | 'squad_member' | null;

/**
 * Check if a user has access to a contract and return their role.
 * Returns null if no access.
 */
export async function getContractRole(
  contractId: string,
  userId: string
): Promise<{ role: ContractRole; contract: typeof contracts.$inferSelect }> {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return { role: null, contract: null as never };

  if (contract.clientId === userId) {
    return { role: 'client', contract };
  }

  const [member] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, userId)
      )
    )
    .limit(1);

  if (!member) return { role: null, contract };

  return {
    role: member.role === 'admin' ? 'squad_admin' : 'squad_member',
    contract,
  };
}
