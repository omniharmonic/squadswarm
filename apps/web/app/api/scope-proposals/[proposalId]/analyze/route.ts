export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { ROLE_TAXONOMY, FORMAT_TAXONOMY } from '@squadswarm/shared';

const SYSTEM_PROMPT = `You are the SquadSwarm Scope Analyst — a helpful, conversational AI that helps clients refine their scope proposals into structured work plans.

You have TWO modes:

**Conversational mode** (default): Talk naturally with the client.

**Structured output mode**: When asked to "analyze", "assess", or "generate a work plan", output a JSON block wrapped in \`\`\`json fences.

When doing an initial assessment, output:
\`\`\`json
{"type":"sufficiency_assessment","dimensions":[{"dimension":"Outcome Clarity","score":80,"feedback":"...","questions":["..."]}],"overallScore":75,"isReady":false}
\`\`\`

When generating a work plan:
\`\`\`json
{"type":"work_plan","summary":"...","workstreams":[{"title":"...","description":"...","orderIndex":0,"dependencies":[],"deliverables":[{"title":"...","description":"...","format":"codebase","acceptanceCriteria":[{"description":"...","measurableCondition":"..."}],"estimatedEffortHours":8,"requiredSkills":["..."],"suggestedRole":"..."}]}],"estimatedTotalHours":40,"suggestedTimelineDays":14,"roles":[{"title":"...","description":"...","isRequired":true}]}
\`\`\`

Rules:
- On first analysis: assess sufficiency. If ALL dimensions >= 60, generate a work plan directly.
- NEVER output both an assessment AND a work plan in the same response.
- CRITICAL: When asked to "auto-improve" or "generate a work plan" — you MUST respond with a work_plan JSON block. Do NOT output another sufficiency_assessment.
- Role taxonomy: ${ROLE_TAXONOMY.join(', ')}
- Format taxonomy: ${FORMAT_TAXONOMY.join(', ')}`;

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

  const scopeContext = `Please analyze this scope proposal:

**${proposal.title}**

${proposal.narrative || '(No narrative provided)'}

${documents.length > 0 ? '**Attached Documents:**\n' + documents.map((d) => `- ${d.fileName}: ${d.extractedText || '(no text extracted)'}`).join('\n') : ''}

**Budget:** ${proposal.budgetMin && proposal.budgetMax ? `$${proposal.budgetMin} - $${proposal.budgetMax}` : 'Not specified'}
**Timeline:** ${proposal.timelineDays ? `${proposal.timelineDays} days` : 'Not specified'}`;

  let messages: Anthropic.MessageParam[];
  if (body.messages?.length) {
    messages = [{ role: 'user' as const, content: scopeContext }];
    for (const m of body.messages as { role: string; content: string }[]) {
      const role = m.role === 'analyst' ? 'assistant' : 'user';
      const last = messages[messages.length - 1];
      if (last && last.role === role) {
        last.content = last.content + '\n\n' + m.content;
      } else {
        messages.push({ role: role as 'user' | 'assistant', content: m.content });
      }
    }
  } else {
    messages = [{ role: 'user' as const, content: scopeContext }];
  }

  await db
    .update(scopeProposals)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();

        // Use non-streaming to get the complete response, then send as SSE
        // This avoids the streaming race condition where on('end') fires
        // before all text is accumulated
        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        });

        // Extract full text
        const fullText = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('');

        // Send the text as chunked SSE events (simulating streaming for the UI)
        const chunkSize = 50;
        for (let i = 0; i < fullText.length; i += chunkSize) {
          const chunk = fullText.slice(i, i + chunkSize);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text: chunk })}\n\n`),
          );
        }

        // Extract JSON from the complete response
        let jsonResult: Record<string, unknown> | null = null;

        // Try fenced JSON
        const fenceMatches = [...fullText.matchAll(/```json\s*([\s\S]*?)```/g)];
        for (const match of fenceMatches.reverse()) {
          try {
            const parsed = JSON.parse(match[1]!.trim());
            if (parsed.type === 'work_plan' || parsed.type === 'sufficiency_assessment') {
              jsonResult = parsed;
              break;
            }
          } catch { /* next */ }
        }

        // Try bare JSON with brace matching
        if (!jsonResult) {
          let depth = 0, start = -1, end = -1;
          for (let i = fullText.length - 1; i >= 0; i--) {
            if (fullText[i] === '}') { if (depth === 0) end = i; depth++; }
            else if (fullText[i] === '{') {
              depth--;
              if (depth === 0 && end >= 0) { start = i; break; }
            }
          }
          if (start >= 0 && end > start) {
            try {
              const parsed = JSON.parse(fullText.slice(start, end + 1));
              if (parsed.type === 'work_plan' || parsed.type === 'sufficiency_assessment') {
                jsonResult = parsed;
              }
            } catch { /* skip */ }
          }
        }

        const resultType = jsonResult?.type as string | undefined;
        const isWorkPlan = resultType === 'work_plan';
        const isReadyAssessment = resultType === 'sufficiency_assessment' && jsonResult?.isReady === true;
        const isReady = isWorkPlan || isReadyAssessment;
        const newStatus = isReady ? 'ready' : 'needs_info';

        // Send done event
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            text: fullText,
            resultType,
            status: newStatus,
          })}\n\n`),
        );
        controller.close();

        // Store result
        await db
          .update(scopeProposals)
          .set({
            aiAnalysis: jsonResult || { raw: fullText },
            status: newStatus,
            updatedAt: new Date(),
          })
          .where(eq(scopeProposals.id, proposalId));

      } catch (error) {
        console.error('Analysis error:', error);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Analysis failed',
          })}\n\n`),
        );
        controller.close();

        db.update(scopeProposals)
          .set({ status: 'needs_info', updatedAt: new Date() })
          .where(eq(scopeProposals.id, proposalId))
          .catch(console.error);
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
