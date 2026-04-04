export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/** Frontend calls this when it detects a work_plan was generated
 *  but the status didn't update (race condition / parse failure fallback) */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposalId } = await params;

  const [proposal] = await db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.id, proposalId))
    .limit(1);

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (proposal.clientId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Only update if stuck in analyzing or needs_info
  if (proposal.status === 'ready' || proposal.status === 'published') {
    return NextResponse.json({ status: proposal.status });
  }

  const [updated] = await db
    .update(scopeProposals)
    .set({ status: 'ready', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId))
    .returning();

  return NextResponse.json({ status: updated?.status || 'ready' });
}
