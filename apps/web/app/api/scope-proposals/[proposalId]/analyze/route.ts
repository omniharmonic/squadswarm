export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { ROLE_TAXONOMY, FORMAT_TAXONOMY } from '@squadswarm/shared';

function buildSystemPrompt() {
  return `You are the SquadSwarm Scope Analyst. Analyze scope documentation and produce structured work plans.

You decompose work into: Scope -> Workstreams -> Deliverables.
Each Deliverable has: title, description, format, acceptance criteria, estimated effort hours, required skills, suggested role.

Role Taxonomy: ${ROLE_TAXONOMY.join(', ')}
Format Taxonomy: ${FORMAT_TAXONOMY.join(', ')}

When analyzing, first assess documentation sufficiency (score dimensions 0-100). If all >= 60, generate a Work Plan. If not, ask specific questions.

When the user asks you to "improve" or "auto-improve" the scope, use your best judgment to fill gaps, strengthen weak areas, and then generate a complete Work Plan.

ALWAYS respond with valid JSON. Choose one of:

If insufficient:
{"type":"sufficiency_assessment","dimensions":[{"dimension":"Outcome Clarity","score":75,"feedback":"...","questions":["..."]}],"overallScore":65,"isReady":false}

If sufficient (or after auto-improvement):
{"type":"work_plan","summary":"...","workstreams":[{"title":"...","description":"...","orderIndex":0,"dependencies":[],"deliverables":[{"title":"...","description":"...","format":"codebase","acceptanceCriteria":[{"description":"...","measurableCondition":"..."}],"estimatedEffortHours":8,"requiredSkills":["..."],"suggestedRole":"..."}]}],"estimatedTotalHours":40,"suggestedTimelineDays":14,"roles":[{"title":"...","description":"...","isRequired":true}]}

IMPORTANT: Respond with ONLY ONE JSON object per response. Never output multiple JSON objects.`;
}

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

  const documents = await db
    .select()
    .from(scopeDocuments)
    .where(eq(scopeDocuments.scopeProposalId, proposalId));

  const body = await req.json().catch(() => ({}));

  // Update status
  await db
    .update(scopeProposals)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  // Build the initial scope context message
  const scopeContext = `## Scope Proposal

### Title
${proposal.title}

### Narrative
${proposal.narrative || '(No narrative provided)'}

### Attached Documents
${documents.length > 0 ? documents.map((d) => `#### ${d.fileName}\n${d.extractedText || `[File: ${d.fileName}]`}`).join('\n\n') : '(No documents)'}

### Constraints
Budget: ${proposal.budgetMin && proposal.budgetMax ? `$${proposal.budgetMin} - $${proposal.budgetMax}` : 'Not specified'}
Timeline: ${proposal.timelineDays ? `${proposal.timelineDays} days` : 'Not specified'}

Assess sufficiency and generate a work plan if ready.`;

  // Build Anthropic messages array
  let messages: Anthropic.MessageParam[];

  if (body.messages?.length) {
    // Follow-up conversation — map roles and prepend scope context
    messages = [
      { role: 'user' as const, content: scopeContext },
      ...body.messages.map((m: { role: string; content: string }) => ({
        role: (m.role === 'analyst' ? 'assistant' : 'user') as 'user' | 'assistant',
        content: m.content,
      })),
    ];
  } else {
    messages = [{ role: 'user' as const, content: scopeContext }];
  }

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const stream = client.messages.stream({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: buildSystemPrompt(),
          messages,
        });

        let fullText = '';

        stream.on('text', (text) => {
          fullText += text;
          const data = JSON.stringify({ type: 'text_delta', text });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        });

        stream.on('error', (error) => {
          console.error('Stream error:', error);
          const data = JSON.stringify({ type: 'error', message: String(error) });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          controller.close();
        });

        stream.on('end', async () => {
          // Parse result
          let resultType: string | undefined;
          let isReady = false;
          try {
            const parsed = JSON.parse(fullText);
            resultType = parsed.type;
            isReady = parsed.type === 'work_plan' || parsed.isReady === true;
          } catch {
            // Try to find JSON in response
            const match = fullText.match(/\{[\s\S]*"type"\s*:\s*"(work_plan|sufficiency_assessment)"[\s\S]*\}/);
            if (match) {
              try {
                const parsed = JSON.parse(match[0]);
                resultType = parsed.type;
                isReady = parsed.type === 'work_plan' || parsed.isReady === true;
              } catch { /* skip */ }
            }
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'done',
              text: fullText,
              resultType,
              status: isReady ? 'ready' : 'needs_info',
            })}\n\n`),
          );
          controller.close();

          // Store result and update status
          const newStatus = isReady ? 'ready' : 'needs_info';
          try {
            const parsed = JSON.parse(fullText);
            await db
              .update(scopeProposals)
              .set({
                aiAnalysis: parsed,
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(eq(scopeProposals.id, proposalId));
          } catch {
            await db
              .update(scopeProposals)
              .set({
                aiAnalysis: { raw: fullText },
                status: newStatus,
                updatedAt: new Date(),
              })
              .where(eq(scopeProposals.id, proposalId));
          }
        });
      } catch (error) {
        console.error('Analysis init error:', error);
        const data = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed',
        });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        controller.close();
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
