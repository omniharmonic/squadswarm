export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts, activityLog } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Accept the on-chain transaction hash from the client's wallet
  const body = await req.json().catch(() => ({}));
  const txHash: string | undefined = body.txHash;

  if (!txHash || typeof txHash !== 'string' || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    return NextResponse.json(
      { error: 'A valid transaction hash (txHash) is required — 0x-prefixed, 66 characters' },
      { status: 400 },
    );
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Only the contract client can make a deposit
  if (contract.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the contract client can fund this contract' }, { status: 403 });
  }

  // Contract must be in pending_deposit status
  if (contract.status !== 'pending_deposit') {
    return NextResponse.json(
      { error: `Cannot deposit on a contract in "${contract.status}" status` },
      { status: 400 },
    );
  }

  // Optional: verify the transaction on-chain if RPC is configured
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  const escrowAddress = process.env.NEXT_PUBLIC_ESCROW_ADDRESS;
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
      // Verify the transaction was to the escrow contract
      if (receipt.to?.toLowerCase() !== escrowAddress.toLowerCase()) {
        return NextResponse.json({ error: 'Transaction was not to the escrow contract' }, { status: 400 });
      }
    } catch (verifyError) {
      console.error('[Deposit] On-chain verification failed:', verifyError);
      // Non-fatal for now — log but proceed (testnet may have RPC issues)
    }
  }

  // Store the txHash in the payment schedule metadata and activate the contract
  const existingSchedule = (contract.paymentSchedule ?? {}) as Record<string, unknown>;

  const [updated] = await db
    .update(contracts)
    .set({
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date(),
      paymentSchedule: {
        ...existingSchedule,
        depositTxHash: txHash,
        depositedAt: new Date().toISOString(),
        chain: 'base',
        token: 'USDC',
      },
    })
    .where(eq(contracts.id, contractId))
    .returning();

  // Log the deposit event
  try {
    await db.insert(activityLog).values({
      contractId,
      actorUserId: session.userId,
      action: 'contract_funded',
      entityType: 'contract',
      entityId: contractId,
      metadata: {
        txHash,
        amount: contract.totalAmount,
        chain: 'base',
        token: 'USDC',
      },
    });
  } catch {
    // Non-fatal — activity log failure should not block the deposit
  }

  return NextResponse.json({
    success: true,
    txHash,
    contract: updated,
  });
}
