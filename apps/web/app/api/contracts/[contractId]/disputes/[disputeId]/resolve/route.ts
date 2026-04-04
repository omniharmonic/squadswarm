export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, disputes, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string; disputeId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId, disputeId } = await params;

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  if (contract.status !== 'disputed') {
    return NextResponse.json(
      { error: `Cannot resolve a dispute on a contract in "${contract.status}" status` },
      { status: 400 },
    );
  }

  // Auth check: client or squad member
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, contract.squadId),
          eq(squadMembers.userId, session.userId),
        ),
      )
      .limit(1);
    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const [dispute] = await db
    .select()
    .from(disputes)
    .where(eq(disputes.id, disputeId))
    .limit(1);

  if (!dispute) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });

  if (dispute.contractId !== contractId) {
    return NextResponse.json({ error: 'Dispute does not belong to this contract' }, { status: 400 });
  }

  if (dispute.status === 'resolved') {
    return NextResponse.json({ error: 'Dispute already resolved' }, { status: 400 });
  }

  const body = await req.json();
  const { resolution, clientPercentage, squadPercentage } = body;

  if (!resolution || typeof resolution !== 'string' || resolution.trim().length === 0) {
    return NextResponse.json({ error: 'Resolution is required' }, { status: 400 });
  }

  if (typeof clientPercentage !== 'number' || typeof squadPercentage !== 'number') {
    return NextResponse.json({ error: 'clientPercentage and squadPercentage are required' }, { status: 400 });
  }

  if (clientPercentage + squadPercentage !== 100) {
    return NextResponse.json({ error: 'clientPercentage + squadPercentage must equal 100' }, { status: 400 });
  }

  // Update dispute
  const [updatedDispute] = await db
    .update(disputes)
    .set({
      status: 'resolved',
      resolution: { text: resolution.trim(), clientPercentage, squadPercentage },
      updatedAt: new Date(),
    })
    .where(eq(disputes.id, disputeId))
    .returning();

  // Update contract status to completed and store dispute split
  await db
    .update(contracts)
    .set({
      status: 'completed',
      completedAt: new Date(),
      disputeSplit: { clientPercentage, squadPercentage },
      updatedAt: new Date(),
    })
    .where(eq(contracts.id, contractId));

  return NextResponse.json(updatedDispute);
}
