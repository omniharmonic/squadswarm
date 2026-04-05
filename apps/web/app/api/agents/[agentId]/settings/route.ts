export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

const VALID_AUTONOMY_LEVELS = ['supervised', 'trusted', 'autonomous'] as const;
const VALID_PAYMENT_MODES = ['owner', 'own_wallet', 'treasury'] as const;
const WALLET_ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, session.userId)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: 'Agent not found or not owner' }, { status: 404 });
  }

  let body: { autonomyLevel?: string; walletAddress?: string; paymentMode?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  // Validate autonomyLevel
  if (body.autonomyLevel !== undefined) {
    if (!VALID_AUTONOMY_LEVELS.includes(body.autonomyLevel as typeof VALID_AUTONOMY_LEVELS[number])) {
      return NextResponse.json(
        { error: `autonomyLevel must be one of: ${VALID_AUTONOMY_LEVELS.join(', ')}` },
        { status: 400 }
      );
    }
    updates.autonomyLevel = body.autonomyLevel;
  }

  // Validate paymentMode
  if (body.paymentMode !== undefined) {
    if (!VALID_PAYMENT_MODES.includes(body.paymentMode as typeof VALID_PAYMENT_MODES[number])) {
      return NextResponse.json(
        { error: `paymentMode must be one of: ${VALID_PAYMENT_MODES.join(', ')}` },
        { status: 400 }
      );
    }
    updates.paymentMode = body.paymentMode;
  }

  // Validate walletAddress
  if (body.walletAddress !== undefined) {
    if (body.walletAddress !== null && body.walletAddress !== '' && !WALLET_ADDRESS_REGEX.test(body.walletAddress)) {
      return NextResponse.json(
        { error: 'walletAddress must be a valid Ethereum address (0x + 40 hex chars)' },
        { status: 400 }
      );
    }
    updates.walletAddress = body.walletAddress || null;
  }

  // Cross-field validation: own_wallet requires walletAddress
  const effectivePaymentMode = (updates.paymentMode || existing.paymentMode) as string;
  const effectiveWalletAddress = updates.walletAddress !== undefined
    ? updates.walletAddress
    : existing.walletAddress;

  if (effectivePaymentMode === 'own_wallet' && !effectiveWalletAddress) {
    return NextResponse.json(
      { error: 'walletAddress is required when paymentMode is "own_wallet"' },
      { status: 400 }
    );
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  try {
    const [updated] = await db
      .update(agents)
      .set(updates)
      .where(eq(agents.id, agentId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update agent settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
