export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, gt } from 'drizzle-orm';
import { db, magicLinks, users } from '@squadswarm/db';
import { createSession, setSessionCookie } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Throttle token guessing.
  const limited = enforceRateLimit(req, 'auth-verify', { limit: 10, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Find valid, unused magic link
    const [link] = await db
      .select()
      .from(magicLinks)
      .where(
        and(
          eq(magicLinks.token, token),
          eq(magicLinks.used, false),
          gt(magicLinks.expiresAt, new Date()),
        ),
      )
      .limit(1);

    if (!link) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }

    // Mark token as used
    await db.update(magicLinks).set({ used: true }).where(eq(magicLinks.id, link.id));

    // Find or create user
    let [user] = await db.select().from(users).where(eq(users.email, link.email)).limit(1);

    if (!user) {
      [user] = await db
        .insert(users)
        .values({
          email: link.email,
          displayName: link.email.split('@')[0],
        })
        .returning();
    }

    // Create session
    const sessionToken = await createSession(user!.id, user!.email!);
    await setSessionCookie(sessionToken);

    return NextResponse.json({
      user: {
        id: user!.id,
        email: user!.email,
        displayName: user!.displayName,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
