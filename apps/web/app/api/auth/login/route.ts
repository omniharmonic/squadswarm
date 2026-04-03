export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { db, magicLinks } from '@squadswarm/db';
import { sendMagicLink } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await db.insert(magicLinks).values({
      email: email.toLowerCase().trim(),
      token,
      expiresAt,
    });

    // In development, skip email sending if no API key
    if (process.env.RESEND_API_KEY) {
      await sendMagicLink(email, token);
    } else {
      console.log(`[DEV] Magic link token for ${email}: ${token}`);
    }

    return NextResponse.json({ message: 'Magic link sent' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
