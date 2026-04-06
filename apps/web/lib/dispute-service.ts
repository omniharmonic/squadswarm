import { eq } from 'drizzle-orm';
import { db, disputes, contracts, activityLog, notifications, attestations, squadMembers } from '@squadswarm/db';

interface ResolveDisputeInput {
  disputeId: string;
  contractId: string;
  resolvedByUserId: string;
  resolution: 'full_client' | 'full_squad' | 'split' | 'negotiated';
  clientPercentage: number;
  squadPercentage: number;
  reason: string;
  txHash?: string;
}

export async function resolveDispute(input: ResolveDisputeInput) {
  const {
    disputeId,
    contractId,
    resolvedByUserId,
    resolution,
    clientPercentage,
    squadPercentage,
    reason,
    txHash,
  } = input;

  // 1. Update dispute record
  const [updatedDispute] = await db
    .update(disputes)
    .set({
      status: 'resolved',
      resolution: {
        type: resolution,
        text: reason,
        clientPercentage,
        squadPercentage,
        resolvedAt: new Date().toISOString(),
        txHash: txHash || null,
      },
      updatedAt: new Date(),
    })
    .where(eq(disputes.id, disputeId))
    .returning();

  // 2. Update contract status and store dispute split
  await db
    .update(contracts)
    .set({
      status: 'completed',
      completedAt: new Date(),
      disputeSplit: { clientPercentage, squadPercentage, resolution, txHash: txHash || null },
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contractId));

  // 3. Log activity
  await db.insert(activityLog).values({
    contractId,
    actorUserId: resolvedByUserId,
    action: 'dispute_resolved',
    entityType: 'dispute',
    entityId: disputeId,
    metadata: {
      resolution,
      clientPercentage,
      squadPercentage,
      reason,
      txHash: txHash || null,
    },
  });

  // 4. Create dispute_resolution attestation
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (contract) {
    await db.insert(attestations).values({
      contractId,
      squadId: contract.squadId,
      userId: resolvedByUserId,
      type: 'dispute_resolution',
      data: {
        disputeId,
        resolution,
        clientPercentage,
        squadPercentage,
        reason,
        txHash: txHash || null,
        totalAmount: contract.totalAmount,
        resolvedAt: new Date().toISOString(),
      },
      onChain: !!txHash,
      chainId: txHash ? '84532' : null, // Base Sepolia
    });
  }

  // 5. Send notifications to all squad members
  if (contract) {
    const members = await db
      .select({ userId: squadMembers.userId })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, contract.squadId));

    // Notify all squad members + client
    const recipientIds = [
      ...members.map((m: { userId: string }) => m.userId),
      contract.clientId,
    ];

    // Deduplicate (in case resolvedByUserId is also a member)
    const uniqueRecipients = [...new Set(recipientIds)];

    const notifValues = uniqueRecipients.map((userId) => ({
      userId,
      type: 'dispute_resolved',
      title: 'Dispute Resolved',
      body: `Dispute on "${contract.title}" has been resolved: ${clientPercentage}% to client, ${squadPercentage}% to squad.`,
      metadata: {
        contractId,
        disputeId,
        resolution,
        clientPercentage,
        squadPercentage,
      },
    }));

    if (notifValues.length > 0) {
      await db.insert(notifications).values(notifValues);
    }
  }

  return updatedDispute;
}
