export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db, magicLinks } from '@squadswarm/db';
import { sendMagicLink } from '@/lib/email';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  // Throttle magic-link requests to deter email-bombing / enumeration.
  const limited = enforceRateLimit(req, 'auth-login', { limit: 5, windowMs: 60_000 });
  if (limited) return limited;

  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Basic email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinks).values({
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
    });

    // In development, skip email sending if no API key. We deliberately do NOT
    // log the raw token: it is a bearer credential and would leak via logs.
    if (process.env.RESEND_API_KEY) {
      await sendMagicLink(email, token);
    } else if (process.env.NODE_ENV !== 'production') {
      console.warn(`[dev] Magic link generated for ${email} (RESEND_API_KEY unset; email not sent).`);
    }

    return NextResponse.json({ message: 'Magic link sent' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
