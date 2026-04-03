export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, scopeProposals } from '@squadswarm/db';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    const [proposal] = await db
      .insert(scopeProposals)
      .values({
        clientId: session.userId,
        title: body.title || 'Untitled Scope',
        narrative: body.narrative,
        categoryTags: body.categoryTags || [],
        budgetMin: body.budgetMin,
        budgetMax: body.budgetMax,
        timelineDays: body.timelineDays,
        feedbackRounds: body.feedbackRounds ?? 3,
        trustThreshold: body.trustThreshold ?? 'open',
        confidentiality: body.confidentiality ?? 'public',
        status: 'draft',
      })
      .returning();

    return NextResponse.json(proposal, { status: 201 });
  } catch (error) {
    console.error('Create scope proposal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const proposals = await db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.clientId, session.userId))
    .orderBy(desc(scopeProposals.updatedAt));

  return NextResponse.json(proposals);
}
