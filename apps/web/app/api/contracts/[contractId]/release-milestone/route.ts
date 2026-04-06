export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, deliverables, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  const body = await req.json().catch(() => ({}));
  const { deliverableId, txHash } = body as { deliverableId?: string; txHash?: string };

  if (!deliverableId || typeof deliverableId !== 'string') {
    return NextResponse.json({ error: 'deliverableId is required' }, { status: 400 });
  }
  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: 'A valid transaction hash (txHash) is required — 0x-prefixed, 66 characters' },
      { status: 400 },
    );
  }

  // Fetch the contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: must be the contract client
  if (contract.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the contract client can release milestones' }, { status: 403 });
  }

  // Fetch the deliverable and validate
  const [deliverable] = await db
    .select()
    .from(deliverables)
    .where(and(eq(deliverables.id, deliverableId), eq(deliverables.contractId, contractId)))
    .limit(1);

  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found for this contract' }, { status: 404 });
  }

  if (deliverable.status !== 'approved') {
    return NextResponse.json(
      { error: `Cannot release milestone for deliverable with status '${deliverable.status}'. Must be 'approved'.` },
      { status: 422 },
    );
  }

  // Calculate the milestone amount using deliverable weights
  const allDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  const weights = (contract.deliverableWeights || {}) as Record<string, number>;
  const totalAmount = parseFloat(contract.totalAmount);
  const paymentSchedule = (contract.paymentSchedule || {}) as Record<string, unknown>;
  const upfrontBps = (paymentSchedule.upfrontPercentage as number) || 0;
  const upfrontAmount = totalAmount * (upfrontBps / 100);
  const milestonePool = totalAmount - upfrontAmount;

  const weightBps = weights[deliverableId] || Math.round(10000 / (allDeliverables.length || 1));
  const milestoneAmount = milestonePool * (weightBps / 10000);

  // Optional: verify the tx on-chain
  const rpcUrl = (process.env.NEXT_PUBLIC_BASE_RPC_URL || '').trim();
  const escrowAddress = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS || '').trim();
  if (rpcUrl && escrowAddress) {
    try {
      const { createPublicClient, http } = await import('viem');
      const { baseSepolia } = await import('viem/chains');
      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http(rpcUrl),
      });
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (!receipt || receipt.status !== 'success') {
        return NextResponse.json({ error: 'Transaction not confirmed on-chain' }, { status: 400 });
      }
      if (receipt.to?.toLowerCase() !== escrowAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Transaction was not to the escrow contract' }, { status: 400 });
      }
    } catch (verifyError) {
      console.error('[ReleaseMilestone] On-chain verification failed:', verifyError);
      // Non-fatal for testnet
    }
  }

  // Store the release info in payment schedule metadata
  const existingSchedule = (contract.paymentSchedule ?? {}) as Record<string, unknown>;
  const milestoneReleases = (existingSchedule.milestoneReleases as Record<string, unknown>[]) || [];
  milestoneReleases.push({
    deliverableId,
    txHash,
    amount: milestoneAmount.toFixed(2),
    releasedAt: new Date().toISOString(),
  });

  // Check if all approved deliverables now have milestone releases
  const releasedDeliverableIds = new Set(
    milestoneReleases.map((r: Record<string, unknown>) => r.deliverableId as string),
  );
  const approvedDeliverables = allDeliverables.filter(d => d.status === 'approved');
  const allMilestonesReleased =
    approvedDeliverables.length > 0 &&
    approvedDeliverables.length === allDeliverables.length &&
    approvedDeliverables.every(d => releasedDeliverableIds.has(d.id));

  await db
    .update(contracts)
    .set({
      updatedAt: new Date(),
      paymentSchedule: {
        ...existingSchedule,
        milestoneReleases,
        ...(allMilestonesReleased ? { allMilestonesReleased: true } : {}),
      },
    })
    .where(eq(contracts.id, contractId));

  // Log the milestone release activity
  await db.insert(activityLog).values({
    contractId,
    actorUserId: session.userId,
    action: 'milestone_released',
    entityType: 'deliverable',
    entityId: deliverableId,
    metadata: {
      amount: milestoneAmount.toFixed(2),
      deliverableId,
      deliverableTitle: deliverable.title,
      txHash,
      token: 'USDC',
      chain: 'base',
    },
  });

  return NextResponse.json({
    success: true,
    amount: milestoneAmount.toFixed(2),
    txHash,
  });
}
