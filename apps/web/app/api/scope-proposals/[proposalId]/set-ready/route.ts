export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

/** Frontend calls this when it detects a work_plan was generated.
 *  Accepts optional workPlan body to store alongside the status update. */
export async function POST(
  req: NextRequest,
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

  if (proposal.status === 'ready' || proposal.status === 'published') {
    return NextResponse.json({ status: proposal.status });
  }

  const body = await req.json().catch(() => ({}));

  // If frontend sends the parsed work plan, store it
  const updateData: Record<string, unknown> = {
    status: 'ready',
    updatedAt: new Date(),
  };

  if (body.workPlan && typeof body.workPlan === 'object' && body.workPlan.type === 'work_plan') {
    updateData.aiAnalysis = body.workPlan;
  } else if (body.rawText && typeof body.rawText === 'string') {
    // Try to extract work plan from raw text
    const fenceMatches = [...body.rawText.matchAll(/```json\s*([\s\S]*?)```/g)];
    for (const match of fenceMatches.reverse()) {
      try {
        const parsed = JSON.parse(match[1].trim());
        if (parsed.type === 'work_plan') {
          updateData.aiAnalysis = parsed;
          break;
        }
      } catch { /* skip */ }
    }
  }

  const [updated] = await db
    .update(scopeProposals)
    .set(updateData)
    .where(eq(scopeProposals.id, proposalId))
    .returning();

  return NextResponse.json({ status: updated?.status || 'ready' });
}
