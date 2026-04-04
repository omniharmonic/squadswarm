import { db, attestations, contracts, users, squads, squadMembers, deliverables, activityLog } from '@squadswarm/db';
import { eq, and } from 'drizzle-orm';
import { createContractCompletionAttestation, createClientSatisfactionAttestation } from '@squadswarm/web3';

/**
 * Create attestations when a contract is completed.
 *
 * For users with wallets: creates on-chain EAS attestations on Base.
 * For users without wallets: stores attestation data off-chain in DB.
 *
 * Attestations created:
 * 1. ContractCompletion — attests the squad completed the work
 * 2. ClientSatisfaction — if the client rated the squad
 * 3. AgentCapability — for each agent that contributed
 */
export async function createContractAttestations(contractId: string): Promise<void> {
  try {
    const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
    if (!contract || contract.status !== 'completed') return;

    const [squad] = await db.select().from(squads).where(eq(squads.id, contract.squadId)).limit(1);
    const [client] = await db.select().from(users).where(eq(users.id, contract.clientId)).limit(1);
    if (!squad || !client) return;

    // 1. Contract Completion attestation
    const completionData = {
      contractId,
      squadAddress: squad.multisigAddress || squad.id,
      clientAddress: client.walletAddress || client.id,
      amount: BigInt(Math.round(Number(contract.totalAmount) * 1e6)),
      durationDays: contract.startedAt && contract.completedAt
        ? Math.ceil((new Date(contract.completedAt).getTime() - new Date(contract.startedAt).getTime()) / 86400000)
        : 0,
      rating: 0, // Will be updated if rating exists
    };

    // Check for existing rating
    const ratingEntries = await db.select().from(activityLog)
      .where(and(eq(activityLog.contractId, contractId), eq(activityLog.action, 'contract_rated')));

    const ratingEntry = ratingEntries[0];
    const ratingData = ratingEntry?.metadata as Record<string, number> | null;
    if (ratingData?.overall) {
      completionData.rating = ratingData.overall;
    }

    // Create completion attestation (off-chain for now)
    const completionAttestation = await createContractCompletionAttestation(completionData);

    await db.insert(attestations).values({
      contractId,
      squadId: contract.squadId,
      userId: contract.clientId,
      type: 'contract_completion',
      easUid: completionAttestation.uid,
      schemaUid: 'CONTRACT_COMPLETION',
      data: completionData,
      onChain: false, // TODO: make on-chain when both parties have wallets
      chainId: '8453', // Base
    });

    // 2. Client Satisfaction attestation (if rated)
    if (ratingData) {
      const satisfactionAttestation = await createClientSatisfactionAttestation({
        contractId,
        squadAddress: squad.multisigAddress || squad.id,
        overall: ratingData.overall || 0,
        quality: ratingData.quality || 0,
        communication: ratingData.communication || 0,
        timeliness: ratingData.timeliness || 0,
        wouldRehire: !!ratingData.wouldRehire,
      });

      await db.insert(attestations).values({
        contractId,
        squadId: contract.squadId,
        userId: contract.clientId,
        type: 'client_satisfaction',
        easUid: satisfactionAttestation.uid,
        schemaUid: 'CLIENT_SATISFACTION',
        data: ratingData,
        onChain: false,
        chainId: '8453',
      });
    }

    // 3. Agent Capability attestations
    const contractDeliverables = await db.select().from(deliverables)
      .where(eq(deliverables.contractId, contractId));

    const agentIds = new Set(
      contractDeliverables
        .map((d) => d.assignedAgentId)
        .filter((id): id is string => !!id)
    );

    for (const agentId of agentIds) {
      const agentDeliverables = contractDeliverables.filter((d) => d.assignedAgentId === agentId);

      await db.insert(attestations).values({
        contractId,
        agentId,
        squadId: contract.squadId,
        type: 'agent_capability',
        schemaUid: 'AGENT_CAPABILITY',
        data: {
          agentId,
          contractId,
          deliverableCount: agentDeliverables.length,
          deliverables: agentDeliverables.map((d) => ({
            title: d.title,
            format: d.format,
            status: d.status,
          })),
        },
        onChain: false,
        chainId: '8453',
      });
    }

    console.log(`[Attestations] Created for contract ${contractId}: completion + ${ratingData ? 'satisfaction' : 'no rating'} + ${agentIds.size} agent(s)`);
  } catch (error) {
    console.error('[Attestations] Error creating attestations:', error);
    // Non-fatal — don't fail the completion
  }
}

/**
 * Get all attestations for a user or squad.
 */
export async function getAttestationsForEntity(entityId: string, entityType: 'user' | 'squad'): Promise<typeof attestations.$inferSelect[]> {
  if (entityType === 'user') {
    return db.select().from(attestations).where(eq(attestations.userId, entityId));
  }
  return db.select().from(attestations).where(eq(attestations.squadId, entityId));
}
