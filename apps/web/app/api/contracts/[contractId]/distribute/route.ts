export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts, activityLog, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { calculateDistribution } from '@/lib/payment-distribution';

const PAYMENT_SPLITTER_ADDRESS = '0xfA1Ca09AE632D5f203d6A71CD1DB97F52dED7329';
const MOCK_USDC_ADDRESS = '0xD4848e222Ab442E1100f59255b46C721D1555Eaa';
const BASE_SEPOLIA_CHAIN_ID = 84532;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  const body = await req.json().catch(() => ({}));
  const { txHash } = body as { txHash?: string };

  // Fetch the contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: must be client or squad admin
  const isClient = contract.clientId === session.userId;
  let isSquadAdmin = false;
  if (!isClient) {
    const allMembers = await db
      .select()
      .from(squadMembers)
      .where(eq(squadMembers.squadId, contract.squadId));

    const userMembership = allMembers.find(m => m.userId === session.userId);
    isSquadAdmin = !!userMembership && (userMembership.role === 'admin' || userMembership.role === 'lead');
  }

  if (!isClient && !isSquadAdmin) {
    return NextResponse.json({ error: 'Only the client or squad admin can distribute payments' }, { status: 403 });
  }

  // Verify contract status
  if (contract.status !== 'active' && contract.status !== 'completed') {
    return NextResponse.json(
      { error: `Cannot distribute payments for contract with status '${contract.status}'. Must be 'active' or 'completed'.` },
      { status: 422 },
    );
  }

  // If txHash is provided, record the distribution
  if (txHash) {
    if (typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
      return NextResponse.json(
        { error: 'A valid transaction hash (txHash) is required — 0x-prefixed, 66 characters' },
        { status: 400 },
      );
    }

    // Store the distribution tx hash in payment schedule metadata
    const existingSchedule = (contract.paymentSchedule ?? {}) as Record<string, unknown>;

    await db
      .update(contracts)
      .set({
        updatedAt: new Date(),
        paymentSchedule: {
          ...existingSchedule,
          distributionTxHash: txHash,
          distributedAt: new Date().toISOString(),
        },
      })
      .where(eq(contracts.id, contractId));

    // Log the distribution activity
    await db.insert(activityLog).values({
      contractId,
      actorUserId: session.userId,
      action: 'payment_distributed',
      entityType: 'contract',
      entityId: contractId,
      metadata: {
        txHash,
        token: 'USDC',
        chain: 'base_sepolia',
      },
    });

    return NextResponse.json({ success: true, txHash });
  }

  // Otherwise, prepare the distribution data for client-side wallet execution
  try {
    const distribution = await calculateDistribution(contractId);

    const totalAmount = parseFloat(contract.totalAmount);
    const splitterAddress = contract.paymentSplitterAddress || PAYMENT_SPLITTER_ADDRESS;

    const membersWithAmounts = distribution.members.map(member => ({
      userId: member.userId,
      agentId: member.agentId,
      displayName: member.displayName,
      walletAddress: member.walletAddress,
      role: member.role,
      shareBps: member.shareBps,
      sharePercent: member.sharePercent,
      estimatedAmount: `$${((totalAmount * member.shareBps) / 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    }));

    return NextResponse.json({
      action: 'distribute',
      contractAddress: splitterAddress,
      functionName: 'distribute',
      args: [MOCK_USDC_ADDRESS],
      members: membersWithAmounts,
      totalAmount: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      treasuryShareBps: distribution.treasuryShareBps,
      treasurySharePercent: Number((distribution.treasuryShareBps / 100).toFixed(2)),
      chainId: BASE_SEPOLIA_CHAIN_ID,
    });
  } catch (err) {
    console.error('[Distribute] Error calculating distribution:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to calculate distribution' },
      { status: 500 },
    );
  }
}
