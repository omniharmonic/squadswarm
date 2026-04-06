import { eq, and } from 'drizzle-orm';
import { db, contracts, bids, bidAssignments, users, agents } from '@squadswarm/db';

export interface DistributionMember {
  userId: string | null;
  agentId: string | null;
  displayName: string;
  walletAddress: string | null;
  shareBps: number;
  sharePercent: number;
  role: string;
}

export interface Distribution {
  members: DistributionMember[];
  totalShareBps: number;
  treasuryShareBps: number;
}

/**
 * Calculate payment distribution for squad members based on bid assignments.
 */
export async function calculateDistribution(contractId: string): Promise<Distribution> {
  // Load the contract to get the bidId
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) throw new Error('Contract not found');

  // Load bid to get treasuryShareBps
  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.id, contract.bidId))
    .limit(1);

  if (!bid) throw new Error('Bid not found');

  const treasuryShareBps = bid.treasuryShareBps ?? 2000;

  // Load bid assignments
  const assignments = await db
    .select()
    .from(bidAssignments)
    .where(eq(bidAssignments.bidId, contract.bidId));

  if (assignments.length === 0) {
    return { members: [], totalShareBps: 0, treasuryShareBps };
  }

  const members: DistributionMember[] = [];
  let totalShareBps = 0;

  for (const assignment of assignments) {
    let displayName = 'Unknown';
    let walletAddress: string | null = null;
    let role = 'member';

    if (assignment.userId) {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, assignment.userId))
        .limit(1);

      if (user) {
        displayName = user.displayName || user.email || 'Unknown';
        walletAddress = user.walletAddress;
        role = 'member';
      }
    }

    if (assignment.agentId) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, assignment.agentId))
        .limit(1);

      if (agent) {
        displayName = agent.name;
        role = 'agent';

        // Resolve wallet based on payment mode
        if (agent.paymentMode === 'own_wallet' && agent.walletAddress) {
          walletAddress = agent.walletAddress;
        } else if (agent.paymentMode === 'treasury') {
          // Treasury share — no wallet needed, goes to squad treasury
          walletAddress = null;
        } else {
          // Default: 'owner' — use agent owner's wallet
          const [owner] = await db
            .select()
            .from(users)
            .where(eq(users.id, agent.ownerId))
            .limit(1);

          if (owner) {
            walletAddress = owner.walletAddress;
            displayName = `${agent.name} (via ${owner.displayName || owner.email || 'owner'})`;
          }
        }
      }
    }

    totalShareBps += assignment.paymentShareBps;
    members.push({
      userId: assignment.userId,
      agentId: assignment.agentId,
      displayName,
      walletAddress,
      shareBps: assignment.paymentShareBps,
      sharePercent: Number((assignment.paymentShareBps / 100).toFixed(2)),
      role,
    });
  }

  return { members, totalShareBps, treasuryShareBps };
}

/**
 * Get the distribution status for a contract.
 */
export async function getDistributionStatus(contractId: string): Promise<{
  distributed: boolean;
  txHash: string | null;
  members: DistributionMember[];
  totalAmount: string;
  treasurySharePercent: number;
}> {
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) throw new Error('Contract not found');

  const paymentSchedule = (contract.paymentSchedule ?? {}) as Record<string, unknown>;
  const distributionTxHash = (paymentSchedule.distributionTxHash as string) || null;

  const distribution = await calculateDistribution(contractId);

  return {
    distributed: !!distributionTxHash,
    txHash: distributionTxHash,
    members: distribution.members,
    totalAmount: contract.totalAmount,
    treasurySharePercent: Number((distribution.treasuryShareBps / 100).toFixed(2)),
  };
}
