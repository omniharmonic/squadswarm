export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, asc } from 'drizzle-orm';
import { db, scopes } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const openScopes = await db
    .select()
    .from(scopes)
    .where(eq(scopes.status, 'open'))
    .orderBy(asc(scopes.biddingDeadline));

  return NextResponse.json(openScopes);
}
