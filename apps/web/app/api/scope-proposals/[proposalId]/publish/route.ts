export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopes } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposalId } = await params;
  const body = await req.json();

  // Fetch proposal
  const [proposal] = await db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.id, proposalId))
    .limit(1);

  if (!proposal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (proposal.clientId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (proposal.status !== 'ready') {
    return NextResponse.json(
      { error: 'Proposal must be in ready status to publish' },
      { status: 400 },
    );
  }

  // Extract work plan from AI analysis
  const aiAnalysis = proposal.aiAnalysis as Record<string, unknown> | null;
  const workPlan = aiAnalysis?.type === 'work_plan' ? aiAnalysis : null;

  if (!workPlan) {
    return NextResponse.json(
      { error: 'No work plan generated. Complete AI analysis first.' },
      { status: 400 },
    );
  }

  // Calculate bidding deadline
  const biddingDeadline = body.biddingDeadline
    ? new Date(body.biddingDeadline)
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default: 7 days from now

  // Create scope
  const [scope] = await db
    .insert(scopes)
    .values({
      proposalId,
      clientId: session.userId,
      title: proposal.title,
      narrative: proposal.narrative,
      categoryTags: proposal.categoryTags,
      budgetMin: proposal.budgetMin,
      budgetMax: proposal.budgetMax,
      timelineDays: proposal.timelineDays,
      feedbackRounds: proposal.feedbackRounds,
      trustThreshold: proposal.trustThreshold,
      confidentiality: proposal.confidentiality,
      workPlan,
      biddingDeadline,
      status: 'open',
    })
    .returning();

  // Update proposal status
  await db
    .update(scopeProposals)
    .set({ status: 'published', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  return NextResponse.json(scope, { status: 201 });
}
