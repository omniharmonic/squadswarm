export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { eq, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(
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

  const documents = await db
    .select()
    .from(scopeDocuments)
    .where(eq(scopeDocuments.scopeProposalId, proposalId))
    .orderBy(desc(scopeDocuments.uploadedAt));

  return NextResponse.json({ ...proposal, documents });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposalId } = await params;
  const body = await req.json();

  // Verify ownership
  const [existing] = await db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.id, proposalId))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.clientId !== session.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [updated] = await db
    .update(scopeProposals)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.narrative !== undefined && { narrative: body.narrative }),
      ...(body.categoryTags !== undefined && { categoryTags: body.categoryTags }),
      ...(body.budgetMin !== undefined && { budgetMin: body.budgetMin }),
      ...(body.budgetMax !== undefined && { budgetMax: body.budgetMax }),
      ...(body.timelineDays !== undefined && { timelineDays: body.timelineDays }),
      ...(body.feedbackRounds !== undefined && { feedbackRounds: body.feedbackRounds }),
      ...(body.trustThreshold !== undefined && { trustThreshold: body.trustThreshold }),
      ...(body.confidentiality !== undefined && { confidentiality: body.confidentiality }),
      updatedAt: new Date(),
    })
    .where(eq(scopeProposals.id, proposalId))
    .returning();

  return NextResponse.json(updated);
}
