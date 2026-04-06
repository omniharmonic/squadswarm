export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, disputes, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { resolveDispute } from '@/lib/dispute-service';

const VALID_RESOLUTIONS = ['full_client', 'full_squad', 'split', 'negotiated'] as const;

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

  // Auth check: only client can resolve (they initiated the contract)
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
    // Also allow squad admins to resolve
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
  const { resolution, clientPercentage, squadPercentage, reason, txHash } = body;

  // Determine resolution type and reason text
  // New format: { resolution: 'split', reason: 'text' }
  // Old format: { resolution: 'text describing resolution' } (backward compat)
  let resolvedType: typeof VALID_RESOLUTIONS[number];
  let resolutionReason: string;

  if (VALID_RESOLUTIONS.includes(resolution)) {
    resolvedType = resolution;
    resolutionReason = reason || '';
  } else if (typeof resolution === 'string' && resolution.trim().length > 0) {
    // Backward compat: resolution field contains the reason text
    resolvedType = clientPercentage === 100 ? 'full_client' : squadPercentage === 100 ? 'full_squad' : clientPercentage === 50 ? 'split' : 'negotiated';
    resolutionReason = resolution;
  } else {
    return NextResponse.json(
      { error: `Resolution must be one of: ${VALID_RESOLUTIONS.join(', ')}` },
      { status: 400 },
    );
  }

  if (!resolutionReason || typeof resolutionReason !== 'string' || resolutionReason.trim().length === 0) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 });
  }

  if (typeof clientPercentage !== 'number' || typeof squadPercentage !== 'number') {
    return NextResponse.json({ error: 'clientPercentage and squadPercentage are required' }, { status: 400 });
  }

  if (clientPercentage < 0 || squadPercentage < 0 || clientPercentage > 100 || squadPercentage > 100) {
    return NextResponse.json({ error: 'Percentages must be between 0 and 100' }, { status: 400 });
  }

  if (clientPercentage + squadPercentage !== 100) {
    return NextResponse.json({ error: 'clientPercentage + squadPercentage must equal 100' }, { status: 400 });
  }

  if (txHash && typeof txHash !== 'string') {
    return NextResponse.json({ error: 'txHash must be a string' }, { status: 400 });
  }

  try {
    const updatedDispute = await resolveDispute({
      disputeId,
      contractId,
      resolvedByUserId: session.userId,
      resolution: resolvedType,
      clientPercentage,
      squadPercentage,
      reason: resolutionReason.trim(),
      txHash: txHash || undefined,
    });

    return NextResponse.json(updatedDispute);
  } catch (err) {
    console.error('Failed to resolve dispute:', err);
    return NextResponse.json({ error: 'Failed to resolve dispute' }, { status: 500 });
  }
}
