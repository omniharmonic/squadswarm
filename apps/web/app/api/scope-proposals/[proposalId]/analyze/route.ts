export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, scopeProposals, scopeDocuments } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { ROLE_TAXONOMY, FORMAT_TAXONOMY } from '@squadswarm/shared';

const SYSTEM_PROMPT = `You are the SquadSwarm Scope Analyst — a helpful, conversational AI that helps clients refine their scope proposals into structured work plans.

## How you work

You have TWO modes:

**Conversational mode** (default): Talk naturally with the client. Answer their questions, discuss the scope, suggest improvements, and help them think through their project. Use markdown formatting.

**Structured output mode**: When specifically asked to "analyze", "assess", or "generate a work plan", output a JSON block wrapped in \`\`\`json fences.

## Structured output formats

When doing an initial assessment:
\`\`\`json
{"type":"sufficiency_assessment","dimensions":[{"dimension":"Outcome Clarity","score":80,"feedback":"...","questions":["..."]}],"overallScore":75,"isReady":false}
\`\`\`

When generating a work plan (only when the scope is sufficiently detailed OR when asked to auto-improve):
\`\`\`json
{"type":"work_plan","summary":"...","workstreams":[{"title":"...","description":"...","orderIndex":0,"dependencies":[],"deliverables":[{"title":"...","description":"...","format":"codebase","acceptanceCriteria":[{"description":"...","measurableCondition":"..."}],"estimatedEffortHours":8,"requiredSkills":["..."],"suggestedRole":"..."}]}],"estimatedTotalHours":40,"suggestedTimelineDays":14,"roles":[{"title":"...","description":"...","isRequired":true}]}
\`\`\`

## Rules
- On first analysis: assess sufficiency. If ALL dimensions >= 60, generate a work plan directly. If not, output the assessment and explain what's missing conversationally.
- NEVER output both an assessment AND a work plan in the same response. Pick ONE.
- When the user asks questions or provides information, respond conversationally. Only output JSON when doing a formal assessment or generating a work plan.
- CRITICAL: When asked to "auto-improve", "fill gaps", or "generate a work plan" — you MUST respond with a work_plan JSON block. Make reasonable assumptions for any missing details. Do NOT output another sufficiency_assessment. The user is asking you to move forward.
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

  // Build the initial scope context
  const scopeContext = `Please analyze this scope proposal:

**${proposal.title}**

${proposal.narrative || '(No narrative provided)'}

${documents.length > 0 ? '**Attached Documents:**\n' + documents.map((d) => `- ${d.fileName}: ${d.extractedText || '(no text extracted)'}`).join('\n') : ''}

**Budget:** ${proposal.budgetMin && proposal.budgetMax ? `$${proposal.budgetMin} - $${proposal.budgetMax}` : 'Not specified'}
**Timeline:** ${proposal.timelineDays ? `${proposal.timelineDays} days` : 'Not specified'}`;

  // Build Anthropic messages
  let messages: Anthropic.MessageParam[];

  if (body.messages?.length) {
    // Continuing a conversation — map roles correctly
    messages = [
      { role: 'user' as const, content: scopeContext },
    ];
    for (const m of body.messages as { role: string; content: string }[]) {
      const role = m.role === 'analyst' ? 'assistant' : 'user';
      // Anthropic requires alternating roles — merge consecutive same-role messages
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

  // Update status to analyzing
  await db
    .update(scopeProposals)
    .set({ status: 'analyzing', updatedAt: new Date() })
    .where(eq(scopeProposals.id, proposalId));

  const encoder = new TextEncoder();
  const readableStream = new ReadableStream({
    async start(controller) {
      try {
        const client = new Anthropic();
        const stream = client.messages.stream({
          model: 'claude-3-haiku-20240307',
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages,
        });

        let fullText = '';

        stream.on('text', (text) => {
          fullText += text;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text_delta', text })}\n\n`));
        });

        stream.on('error', (error) => {
          console.error('Stream error:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: String(error) })}\n\n`));
          controller.close();
        });

        stream.on('end', async () => {
          // Extract JSON from the response (may be wrapped in ```json fences)
          let jsonResult: Record<string, unknown> | null = null;
          const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/);
          if (jsonMatch?.[1]) {
            try { jsonResult = JSON.parse(jsonMatch[1].trim()); } catch { /* skip */ }
          }
          // Also try parsing the whole thing as JSON (in case AI didn't use fences)
          if (!jsonResult) {
            try { jsonResult = JSON.parse(fullText.trim()); } catch { /* skip */ }
          }

          const resultType = jsonResult?.type as string | undefined;
          const isWorkPlan = resultType === 'work_plan';
          const isReadyAssessment = resultType === 'sufficiency_assessment' && (jsonResult as Record<string, unknown>)?.isReady === true;
          const isReady = isWorkPlan || isReadyAssessment;

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            text: fullText,
            resultType,
            status: isReady ? 'ready' : 'needs_info',
          })}\n\n`));
          controller.close();

          // Store result
          const newStatus = isReady ? 'ready' : 'needs_info';
          await db
            .update(scopeProposals)
            .set({
              aiAnalysis: jsonResult || { raw: fullText },
              status: newStatus,
              updatedAt: new Date(),
            })
            .where(eq(scopeProposals.id, proposalId));
        });
      } catch (error) {
        console.error('Analysis init error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Analysis failed',
        })}\n\n`));
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
