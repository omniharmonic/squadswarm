export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { calculateTrustScore } from '@/lib/trust-calculator';
import { getAttestationBonus } from '@/lib/attestation-scoring';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { score: rawScore, breakdown } = await calculateTrustScore(session.userId);
  const attBonus = await getAttestationBonus(session.userId);
  const finalScore = Math.max(0, Math.min(rawScore + attBonus.bonus, 100));

  // Update DB
  await db
    .update(users)
    .set({ trustScore: finalScore.toString(), updatedAt: new Date() })
    .where(eq(users.id, session.userId));

  return NextResponse.json({
    trustScore: finalScore,
    breakdown: {
      ...breakdown,
      attestations: attBonus.bonus,
    },
    details: {
      hasBio: !!user.bio && user.bio.trim().length > 0,
      attestationCount: attBonus.attestationCount,
      attestationsByType: attBonus.byType,
    },
  });
}
