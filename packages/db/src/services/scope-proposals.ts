import { eq, desc } from 'drizzle-orm';
import { db } from '../client';
import { scopeProposals } from '../schema/scope-proposals';
import { scopeDocuments } from '../schema/scope-documents';

export async function createScopeProposal(data: {
  clientId: string;
  title: string;
  narrative?: string;
  categoryTags?: string[];
  budgetMin?: string;
  budgetMax?: string;
  timelineDays?: number;
  feedbackRounds?: number;
  trustThreshold?: string;
  confidentiality?: string;
}) {
  const [proposal] = await db
    .insert(scopeProposals)
    .values({
      ...data,
      status: 'draft',
    })
    .returning();
  return proposal;
}

export async function getScopeProposal(id: string) {
  const [proposal] = await db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.id, id))
    .limit(1);

  if (!proposal) return null;

  const documents = await db
    .select()
    .from(scopeDocuments)
    .where(eq(scopeDocuments.scopeProposalId, id))
    .orderBy(desc(scopeDocuments.uploadedAt));

  return { ...proposal, documents };
}

export async function updateScopeProposal(
  id: string,
  data: Partial<{
    title: string;
    narrative: string;
    categoryTags: string[];
    budgetMin: string;
    budgetMax: string;
    timelineDays: number;
    feedbackRounds: number;
    trustThreshold: string;
    confidentiality: string;
    aiAnalysis: unknown;
    documentationScore: string;
    status: string;
  }>,
) {
  const [updated] = await db
    .update(scopeProposals)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(scopeProposals.id, id))
    .returning();
  return updated;
}

export async function listScopeProposalsByClient(clientId: string) {
  return db
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.clientId, clientId))
    .orderBy(desc(scopeProposals.updatedAt));
}

export async function addScopeDocument(data: {
  scopeProposalId: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  fileSizeBytes?: number;
  extractedText?: string;
}) {
  const [doc] = await db.insert(scopeDocuments).values(data).returning();
  return doc;
}
