export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { recoverMessageAddress, getAddress } from 'viem';
import { db, users } from '@squadswarm/db';
import { eq } from 'drizzle-orm';
import { createSession, getSession, setSessionCookie } from '@/lib/auth';
import { randomBytes } from 'crypto';

/**
 * GET /api/auth/siwe — generate a random nonce for SIWE message construction
 */
export async function GET() {
  const nonce = randomBytes(16).toString('hex');
  return NextResponse.json({ nonce });
}

/**
 * POST /api/auth/siwe — verify a signed SIWE message
 * Body: { message: string, signature: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { message, signature } = await req.json();

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Missing message or signature' },
        { status: 400 },
      );
    }

    // Extract and checksum the address
    const rawAddress = extractAddress(message);
    const expectedAddress = getAddress(rawAddress);

    // Verify the signature by recovering the signer address
    let valid = false;
    try {
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });
      valid =
        recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (verifyError) {
      console.error('SIWE signature verification error:', verifyError);
      return NextResponse.json(
        {
          error: 'Signature verification failed',
          detail:
            verifyError instanceof Error
              ? verifyError.message
              : 'Unknown',
        },
        { status: 401 },
      );
    }

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 },
      );
    }

    const checksumAddress = expectedAddress;

    const walletAddress = checksumAddress.toLowerCase();
    const session = await getSession();

    let user;

    if (session) {
      // Link wallet to existing authenticated user
      const [updated] = await db
        .update(users)
        .set({
          walletAddress,
          web3Enabled: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, session.userId))
        .returning();
      user = updated;
    } else {
      // Check if wallet already has an account
      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress))
        .limit(1);

      if (existing) {
        user = existing;
      } else {
        // Create new user with wallet
        const [created] = await db
          .insert(users)
          .values({
            walletAddress,
            web3Enabled: true,
            displayName: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
          })
          .returning();
        user = created;
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to process wallet authentication' },
        { status: 500 },
      );
    }

    // Create session and set cookie
    const token = await createSession(user.id, user.email ?? walletAddress);
    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        walletAddress: user.walletAddress,
        web3Enabled: user.web3Enabled,
      },
    });
  } catch (error) {
    console.error('SIWE verification error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Authentication failed', detail: errorMessage },
      { status: 500 },
    );
  }
}

/**
 * Extract Ethereum address from a SIWE message string.
 * SIWE messages follow the format: "{domain} wants you to sign in with your Ethereum account:\n{address}\n..."
 */
function extractAddress(message: string): `0x${string}` {
  const match = message.match(/0x[a-fA-F0-9]{40}/);
  if (!match) {
    throw new Error('No Ethereum address found in message');
  }
  return match[0] as `0x${string}`;
}
