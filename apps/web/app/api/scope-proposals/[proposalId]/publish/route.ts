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
      { error: `Proposal must be in ready status to publish (current: ${proposal.status})` },
      { status: 400 },
    );
  }

  // Extract work plan from AI analysis — handle multiple storage formats
  const aiAnalysis = proposal.aiAnalysis as Record<string, unknown> | null;
  let workPlan: Record<string, unknown> | null = null;

  if (aiAnalysis?.type === 'work_plan') {
    workPlan = aiAnalysis;
  } else if (typeof aiAnalysis?.raw === 'string') {
    // Stored as { raw: "json string" } — try to extract work plan
    const rawStr = aiAnalysis.raw as string;
    const jsonMatch = rawStr.match(/```json\s*([\s\S]*?)```/);
    const toParse = jsonMatch?.[1]?.trim() || rawStr.trim();
    try {
      const parsed = JSON.parse(toParse);
      if (parsed.type === 'work_plan') workPlan = parsed;
    } catch { /* skip */ }
  }

  if (!workPlan) {
    return NextResponse.json(
      { error: 'No work plan found in analysis. Use "Auto-improve" to generate one.' },
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
