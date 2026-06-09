import Anthropic from '@anthropic-ai/sdk';
import { ROLE_TAXONOMY, FORMAT_TAXONOMY, WorkPlanSchema } from '@squadswarm/shared';
import { normalizeSkills, filterVagueSkills } from './skill-normalizer';
import { MODELS } from './models';
import { wrapUntrusted, INJECTION_GUARD } from './sanitize';

function getClient() {
  return new Anthropic();
}

const SUFFICIENCY_RUBRIC = `
## Sufficiency Dimensions (score each 0-100)

1. **Outcome Clarity** — Is the desired end state clearly described? Can someone read this and understand what "done" looks like?
2. **Deliverable Specificity** — Are the specific outputs (documents, code, designs, etc.) named and described?
3. **Audience & Context** — Is it clear who will use the outputs and in what context?
4. **Technical Constraints** — Are technology choices, compatibility requirements, and existing systems described?
5. **Quality Standards** — Are there measurable criteria for acceptable quality?
6. **Budget & Timeline** — Are financial and temporal constraints stated?
7. **Dependencies & Assumptions** — Are external dependencies, access requirements, and assumptions documented?
`;

/**
 * The canonical Scope Analyst system prompt. This is the single source of truth
 * shared by every caller (API route, scripts). It supports a conversational
 * mode (natural-language reply) and a structured mode (a fenced JSON block) so
 * the UI can stream prose and then render the parsed result.
 */
export function buildSystemPrompt(): string {
  return `You are the SquadSwarm Scope Analyst — a helpful, conversational AI that helps clients refine their scope proposals into structured work plans.

${INJECTION_GUARD}

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

${SUFFICIENCY_RUBRIC}

Rules:
- On first analysis: assess sufficiency. If ALL dimensions >= 60, generate a work plan directly.
- NEVER output both an assessment AND a work plan in the same response.
- CRITICAL: When asked to "auto-improve" or "generate a work plan" — you MUST respond with a work_plan JSON block. Do NOT output another sufficiency_assessment.
- Every deliverable MUST include a "requiredSkills" array of 2-5 specific, canonical skill names (e.g., "React", "PostgreSQL", "Figma") — never vague terms like "development" or "coding".
- Role taxonomy: ${ROLE_TAXONOMY.join(', ')}
- Format taxonomy: ${FORMAT_TAXONOMY.join(', ')}`;
}

export interface ScopeContextInput {
  title: string;
  narrative?: string | null;
  documents: { name: string; content: string }[];
  budgetMin?: string | null;
  budgetMax?: string | null;
  timelineDays?: number | null;
}

/**
 * Build the first user message describing the scope. All client-supplied text
 * (narrative, document bodies) is wrapped in untrusted delimiters.
 */
export function buildScopeContext(input: ScopeContextInput): string {
  const budget =
    input.budgetMin && input.budgetMax
      ? `$${input.budgetMin} - $${input.budgetMax}`
      : input.budgetMin
        ? `From $${input.budgetMin}`
        : input.budgetMax
          ? `Up to $${input.budgetMax}`
          : 'Not specified';

  const docs =
    input.documents.length > 0
      ? input.documents.map((d) => wrapUntrusted('document', `${d.name}\n${d.content}`)).join('\n\n')
      : '(No documents attached)';

  return `Please analyze this scope proposal.

**Title:** ${wrapUntrusted('title', input.title)}

**Narrative:**
${wrapUntrusted('narrative', input.narrative || '(No narrative provided)')}

**Attached Documents:**
${docs}

**Budget:** ${budget}
**Timeline:** ${input.timelineDays ? `${input.timelineDays} days` : 'Not specified'}`;
}

export interface AnalyzeInput extends ScopeContextInput {
  conversationHistory?: { role: string; content: string }[];
}

/**
 * Start a streaming Scope Analyst run. Returns the Anthropic message stream so
 * the caller can forward tokens to the client in real time. The first message
 * is always the (sanitized) scope context; any prior turns follow.
 */
export function analyzeScopeStreaming(input: AnalyzeInput) {
  const client = getClient();
  const context = buildScopeContext(input);

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: context }];
  for (const m of input.conversationHistory ?? []) {
    const role: 'user' | 'assistant' = m.role === 'analyst' || m.role === 'assistant' ? 'assistant' : 'user';
    const last = messages[messages.length - 1];
    if (last && last.role === role && typeof last.content === 'string') {
      last.content = `${last.content}\n\n${m.content}`;
    } else {
      messages.push({ role, content: m.content });
    }
  }

  return client.messages.stream({
    model: MODELS.scopeAnalyst,
    max_tokens: 8192,
    system: buildSystemPrompt(),
    messages,
  });
}

export interface ScopeAnalysisResult {
  type: 'work_plan' | 'sufficiency_assessment';
  [key: string]: unknown;
}

/**
 * Extract the analysis JSON from a model response (fenced or bare), then
 * normalize skills and validate work plans against the shared Zod schema.
 * Returns null if no recognizable result is found.
 */
export function extractAnalysisResult(fullText: string): ScopeAnalysisResult | null {
  let parsed: ScopeAnalysisResult | null = null;

  // Prefer the last fenced ```json block.
  const fenceMatches = [...fullText.matchAll(/```json\s*([\s\S]*?)```/g)];
  for (const match of fenceMatches.reverse()) {
    try {
      const obj = JSON.parse(match[1]!.trim());
      if (obj?.type === 'work_plan' || obj?.type === 'sufficiency_assessment') {
        parsed = obj;
        break;
      }
    } catch {
      /* try next */
    }
  }

  // Fall back to the last balanced bare object.
  if (!parsed) {
    let depth = 0;
    let start = -1;
    let end = -1;
    for (let i = fullText.length - 1; i >= 0; i--) {
      const ch = fullText[i];
      if (ch === '}') {
        if (depth === 0) end = i;
        depth++;
      } else if (ch === '{') {
        depth--;
        if (depth === 0 && end >= 0) {
          start = i;
          break;
        }
      }
    }
    if (start >= 0 && end > start) {
      try {
        const obj = JSON.parse(fullText.slice(start, end + 1));
        if (obj?.type === 'work_plan' || obj?.type === 'sufficiency_assessment') parsed = obj;
      } catch {
        /* ignore */
      }
    }
  }

  if (!parsed) return null;

  if (parsed.type === 'work_plan') {
    normalizeWorkPlanSkills(parsed);
    // Validate shape; on failure we still return the plan but flag it so callers
    // can decide. The schema tolerates extra fields like `type`/`suggestedRole`.
    const check = WorkPlanSchema.safeParse(parsed);
    parsed._valid = check.success;
    if (!check.success) parsed._validationErrors = check.error.flatten();
  }

  return parsed;
}

export async function scoreDocumentation(input: {
  narrative: string;
  documents: { name: string; content: string }[];
}) {
  const client = getClient();

  const response = await client.messages.create({
    model: MODELS.scopeAnalyst,
    max_tokens: 2048,
    system: `You are a documentation sufficiency scorer. Score each dimension 0-100 and return JSON.

${INJECTION_GUARD}
${SUFFICIENCY_RUBRIC}

Respond with ONLY a JSON object:
{
  "dimensions": [
    { "dimension": "Outcome Clarity", "score": 75, "feedback": "brief feedback" }
  ],
  "overallScore": 70,
  "isReady": false
}`,
    messages: [
      {
        role: 'user',
        content: `${wrapUntrusted('narrative', input.narrative || '(empty)')}\n\nDocuments: ${input.documents.length} attached (${input.documents.map((d) => d.name).join(', ') || 'none'})`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return JSON.parse(text);
}

/**
 * Normalize and validate skills on every deliverable of a work plan in-place.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeWorkPlanSkills(workPlan: any): any {
  if (!workPlan || workPlan.type !== 'work_plan' || !Array.isArray(workPlan.workstreams)) {
    return workPlan;
  }

  for (const workstream of workPlan.workstreams) {
    if (!Array.isArray(workstream.deliverables)) continue;

    for (const deliverable of workstream.deliverables) {
      const rawSkills: string[] = Array.isArray(deliverable.requiredSkills) ? deliverable.requiredSkills : [];
      const filtered = filterVagueSkills(rawSkills);
      const skillsToNormalize = filtered.length > 0 ? filtered : rawSkills;
      const normalized = normalizeSkills(skillsToNormalize);
      deliverable.requiredSkills = normalized.map((s) => s.canonical);
    }
  }

  return workPlan;
}
