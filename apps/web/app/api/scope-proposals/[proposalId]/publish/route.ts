export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopes } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

function extractWorkPlanFromText(text: string): Record<string, unknown> | null {
  // Try fenced JSON blocks
  const fenceMatches = [...text.matchAll(/```json\s*([\s\S]*?)```/g)];
  for (const match of fenceMatches.reverse()) {
    try {
      const parsed = JSON.parse(match[1]!.trim());
      if (parsed.type === 'work_plan') return parsed;
    } catch { /* next */ }
  }
  // Try brace matching for last top-level object
  let depth = 0, lastStart = -1, lastEnd = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') { if (depth === 0) lastStart = i; depth++; }
    else if (text[i] === '}') { depth--; if (depth === 0 && lastStart >= 0) lastEnd = i; }
  }
  if (lastStart >= 0 && lastEnd > lastStart) {
    try {
      const parsed = JSON.parse(text.slice(lastStart, lastEnd + 1));
      if (parsed.type === 'work_plan') return parsed;
    } catch { /* skip */ }
  }
  return null;
}

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

  // Extract work plan — try multiple sources
  const aiAnalysis = proposal.aiAnalysis as Record<string, unknown> | null;
  let workPlan: Record<string, unknown> | null = null;

  // Source 1: ai_analysis is directly a work_plan
  if (aiAnalysis?.type === 'work_plan') {
    workPlan = aiAnalysis;
  }

  // Source 2: ai_analysis has { raw: "..." }
  if (!workPlan && typeof aiAnalysis?.raw === 'string') {
    workPlan = extractWorkPlanFromText(aiAnalysis.raw as string);
  }

  // Source 3: request body has workPlan or rawText (frontend fallback)
  if (!workPlan && body.workPlan?.type === 'work_plan') {
    workPlan = body.workPlan;
  }
  if (!workPlan && typeof body.rawText === 'string') {
    workPlan = extractWorkPlanFromText(body.rawText);
  }

  if (!workPlan) {
    return NextResponse.json(
      { error: 'No work plan found. Use "Auto-improve" in the AI analysis to generate one before publishing.' },
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
