export const dynamic = 'force-dynamic';

// TODO: Integrate Stripe Checkout

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, contracts } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

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

  // Simulate payment — set contract to active
  const [updated] = await db
    .update(contracts)
    .set({
      status: 'active',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contractId))
    .returning();

  // Return a mock payment ID for demo purposes
  const mockPaymentId = `pay_demo_${Date.now()}_${contractId.slice(0, 8)}`;

  return NextResponse.json({
    success: true,
    paymentId: mockPaymentId,
    contract: updated,
  });
}
