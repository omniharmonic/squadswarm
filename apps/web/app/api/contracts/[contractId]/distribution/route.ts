export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getDistributionStatus } from '@/lib/payment-distribution';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Verify contract exists
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  try {
    const status = await getDistributionStatus(contractId);
    const totalAmount = parseFloat(contract.totalAmount);

    const membersWithAmounts = status.members.map(member => ({
      displayName: member.displayName,
      role: member.role,
      sharePercent: member.sharePercent,
      estimatedAmount: `$${((totalAmount * member.shareBps) / 10000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      walletAddress: member.walletAddress,
    }));

    return NextResponse.json({
      distributed: status.distributed,
      txHash: status.txHash,
      members: membersWithAmounts,
      totalAmount: `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      treasurySharePercent: status.treasurySharePercent,
    });
  } catch (err) {
    console.error('[Distribution] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to get distribution status' },
      { status: 500 },
    );
  }
}
