export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, disputes, squadMembers, users, squads } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
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

  // Fetch raised-by user info
  const [raisedByUser] = await db
    .select({ displayName: users.displayName, email: users.email })
    .from(users)
    .where(eq(users.id, dispute.raisedById))
    .limit(1);

  // Fetch squad info
  const [squad] = await db
    .select({ name: squads.name })
    .from(squads)
    .where(eq(squads.id, contract.squadId))
    .limit(1);

  return NextResponse.json({
    dispute: {
      id: dispute.id,
      contractId: dispute.contractId,
      status: dispute.status,
      reason: dispute.reason,
      raisedById: dispute.raisedById,
      resolution: dispute.resolution,
      evidence: dispute.evidence,
      createdAt: dispute.createdAt,
      updatedAt: dispute.updatedAt,
    },
    contract: {
      title: contract.title,
      totalAmount: contract.totalAmount,
      status: contract.status,
    },
    raisedByUser: raisedByUser || { displayName: 'Unknown', email: null },
    squadName: squad?.name || 'Unknown Squad',
  });
}
