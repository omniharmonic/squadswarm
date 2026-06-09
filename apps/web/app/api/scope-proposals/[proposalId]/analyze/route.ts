export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { analyzeScopeStreaming, extractAnalysisResult, MODELS } from '@squadswarm/ai';
import { logAiUsage } from '@/lib/ai-usage';
import { enforceRateLimit } from '@/lib/rate-limit';

/**
 * Stream a Scope Analyst run over SSE. Prompt construction, model selection,
 * injection hardening, JSON extraction and validation all live in
 * `@squadswarm/ai` — this route is the thin transport + persistence layer.
 *
 * SSE events: { type: 'text_delta', text } · { type: 'done', text, resultType,
 * status } · { type: 'error', message }.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // AI analysis is expensive; cap per-IP to deter abuse/cost-bombing.
  const limited = enforceRateLimit(req, 'scope-analyze', { limit: 20, windowMs: 60_000 });
  if (limited) return limited;

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
    .where(eq(scopeDocuments.scopeProposalId, proposalId));

  const body = await req.json().catch(() => ({}));

  await db
    .update(scopeProposals)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      try {
        const messageStream = analyzeScopeStreaming({
          title: proposal.title,
          narrative: proposal.narrative,
          documents: documents.map((d) => ({ name: d.fileName, content: d.extractedText || '' })),
          budgetMin: proposal.budgetMin,
          budgetMax: proposal.budgetMax,
          timelineDays: proposal.timelineDays,
          conversationHistory: Array.isArray(body.messages) ? body.messages : undefined,
        });

        // Forward real token deltas as they arrive.
        messageStream.on('text', (text: string) => send({ type: 'text_delta', text }));

        const finalMessage = await messageStream.finalMessage();
        const fullText = finalMessage.content
          .filter((b): b is { type: 'text'; text: string; citations: [] } => b.type === 'text')
          .map((b) => b.text)
          .join('');

        const result = extractAnalysisResult(fullText);
        const isWorkPlan = result?.type === 'work_plan';
        const isReadyAssessment = result?.type === 'sufficiency_assessment' && result?.isReady === true;
        const newStatus = isWorkPlan || isReadyAssessment ? 'ready' : 'needs_info';

        send({ type: 'done', text: fullText, resultType: result?.type, status: newStatus });
        controller.close();

        await db
          .update(scopeProposals)
          .set({ aiAnalysis: result || { raw: fullText }, status: newStatus, updatedAt: new Date() })
          .where(eq(scopeProposals.id, proposalId));

        await logAiUsage({
          model: MODELS.scopeAnalyst,
          inputTokens: finalMessage.usage?.input_tokens,
          outputTokens: finalMessage.usage?.output_tokens,
          purpose: 'scope_analysis',
          entityId: proposalId,
        });
      } catch (error) {
        console.error('Analysis error:', error);
        send({ type: 'error', message: error instanceof Error ? error.message : 'Analysis failed' });
        controller.close();
        db.update(scopeProposals)
          .set({ status: 'needs_info', updatedAt: new Date() })
          .where(eq(scopeProposals.id, proposalId))
          .catch(console.error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
