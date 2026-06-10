export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getContractRole } from '@/lib/contract-access';
import { getDistributionStatus } from '@/lib/payment-distribution';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Payment splits + wallet addresses are sensitive: only the client and squad
  // members of this contract may see them.
  const { role, contract } = await getContractRole(contractId, session.userId);
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
  if (!role) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

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
