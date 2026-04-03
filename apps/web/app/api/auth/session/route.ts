export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, users } from '@squadswarm/db';
import { getSession, clearSessionCookie } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.id, session.userId)).limit(1);

  if (!user) {
    await clearSessionCookie();
    return NextResponse.json({ error: 'User not found' }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      web3Enabled: user.web3Enabled,
      trustScore: user.trustScore,
    },
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ message: 'Logged out' });
}
