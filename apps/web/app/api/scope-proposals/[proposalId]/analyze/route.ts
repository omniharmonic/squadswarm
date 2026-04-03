export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { analyzeScopeStreaming } from '@squadswarm/ai';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ proposalId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { proposalId } = await params;

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

  // Fetch documents with extracted text
  const documents = await db
    .select()
    .from(scopeDocuments)
    .where(eq(scopeDocuments.scopeProposalId, proposalId));

  // Parse any conversation history from the request body
  const body = await req.json().catch(() => ({}));

  // Update status to analyzing
  await db
    .update(scopeProposals)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  // Stream the AI analysis
  const stream = await analyzeScopeStreaming({
    narrative: proposal.narrative || '',
    documents: documents.map((d) => ({
      name: d.fileName,
      content: d.extractedText || `[File: ${d.fileName} (${d.fileType})]`,
    })),
    budgetMin: proposal.budgetMin,
    budgetMax: proposal.budgetMax,
    timelineDays: proposal.timelineDays,
    conversationHistory: body.messages,
  });

  // Create a TransformStream to capture the full response for storage
  let fullText = '';

  const transformStream = new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
  });

  // Pipe the Anthropic stream through, collecting text as we go
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullText += event.delta.text;
            const data = JSON.stringify({
              type: 'text_delta',
              text: event.delta.text,
            });
            controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
          }
        }

        // Send the complete event
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({ type: 'done', text: fullText })}\n\n`,
          ),
        );
        controller.close();

        // Store the analysis result
        try {
          const parsed = JSON.parse(fullText);
          const isReady = parsed.type === 'work_plan' || parsed.isReady === true;
          await db
            .update(scopeProposals)
            .set({
              aiAnalysis: parsed,
              status: isReady ? 'ready' : 'needs_info',
              updatedAt: new Date(),
            })
            .where(eq(scopeProposals.id, proposalId));
        } catch {
          // If parsing fails, store raw text
          await db
            .update(scopeProposals)
            .set({
              aiAnalysis: { raw: fullText },
              status: 'needs_info',
              updatedAt: new Date(),
            })
            .where(eq(scopeProposals.id, proposalId));
        }
      } catch (error) {
        console.error('Analysis stream error:', error);
        controller.error(error);
      }
    },
  });

  return new Response(readableStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
