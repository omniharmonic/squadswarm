import Anthropic from '@anthropic-ai/sdk';
import { ROLE_TAXONOMY, FORMAT_TAXONOMY } from '@squadswarm/shared';

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

function buildSystemPrompt() {
  return `You are the SquadSwarm Scope Analyst. Your job is to analyze scope documentation submitted by clients and produce structured, actionable work plans.

## Your Ontology

You decompose work into this hierarchy:
- Scope -> Workstreams -> Deliverables
- Each Deliverable has: title, description, format, acceptance criteria, estimated effort hours, required skills, suggested role
- Each Workstream has: title, description, deliverables, dependencies on other workstreams, order index

## Role Taxonomy
${ROLE_TAXONOMY.join(', ')}

## Deliverable Format Taxonomy
${FORMAT_TAXONOMY.join(', ')}

${SUFFICIENCY_RUBRIC}

## Instructions

When analyzing a scope proposal:

1. First, assess documentation sufficiency against the rubric. Score each dimension 0-100.
2. If any dimension is below 60, ask specific, actionable questions. Do not ask generic questions — be precise about what is missing and why it matters for work planning.
3. If all dimensions are >= 60, generate a complete Work Plan.
4. For the Work Plan, think carefully about:
   - Which deliverables can be produced in parallel vs which have hard dependencies
   - Which tasks are well-suited for AI agent execution vs requiring human judgment
   - Realistic effort estimates (err on the side of generous)
   - Clear, measurable acceptance criteria

## Response Format

ALWAYS respond with valid JSON. Choose one of two formats:

**If documentation is insufficient:**
\`\`\`json
{
  "type": "sufficiency_assessment",
  "dimensions": [
    { "dimension": "Outcome Clarity", "score": 75, "feedback": "...", "questions": ["..."] }
  ],
  "overallScore": 65,
  "isReady": false
}
\`\`\`

**If documentation is sufficient, generate a work plan:**
\`\`\`json
{
  "type": "work_plan",
  "summary": "High-level summary of the work",
  "workstreams": [
    {
      "title": "Workstream name",
      "description": "What this workstream covers",
      "orderIndex": 0,
      "dependencies": [],
      "deliverables": [
        {
          "title": "Deliverable name",
          "description": "What must be produced",
          "format": "document",
          "acceptanceCriteria": [
            { "description": "Criterion", "measurableCondition": "How to verify" }
          ],
          "estimatedEffortHours": 8,
          "requiredSkills": ["skill1"],
          "suggestedRole": "Role Name"
        }
      ]
    }
  ],
  "estimatedTotalHours": 40,
  "suggestedTimelineDays": 14,
  "roles": [
    { "title": "Role name", "description": "What this role does", "isRequired": true }
  ]
}
\`\`\`

Respond ONLY with the JSON object, no markdown code fences.`;
}

export interface AnalyzeInput {
  narrative: string;
  documents: { name: string; content: string }[];
  budgetMin?: string | null;
  budgetMax?: string | null;
  timelineDays?: number | null;
  conversationHistory?: Anthropic.MessageParam[];
}

export async function analyzeScopeStreaming(input: AnalyzeInput) {
  const client = getClient();

  const userMessage = `## Scope Proposal

### Narrative
${input.narrative || '(No narrative provided)'}

### Attached Documents
${input.documents.length > 0 ? input.documents.map((d) => `#### ${d.name}\n${d.content}`).join('\n\n') : '(No documents attached)'}

### Constraints
Budget: ${input.budgetMin && input.budgetMax ? `$${input.budgetMin} - $${input.budgetMax}` : input.budgetMin ? `From $${input.budgetMin}` : input.budgetMax ? `Up to $${input.budgetMax}` : 'Not specified'}
Timeline: ${input.timelineDays ? `${input.timelineDays} days` : 'Not specified'}

## Task
Assess this proposal's documentation sufficiency. If sufficient (all dimensions >= 60), generate a full Work Plan. If not, provide specific questions.`;

  const messages: Anthropic.MessageParam[] = input.conversationHistory?.length
    ? [...input.conversationHistory]
    : [{ role: 'user', content: userMessage }];

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 8192,
    system: buildSystemPrompt(),
    messages,
  });

  return stream;
}

export async function scoreDocumentation(input: {
  narrative: string;
  documents: { name: string; content: string }[];
}) {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5-20250514',
    max_tokens: 2048,
    system: `You are a documentation sufficiency scorer. Score each dimension 0-100 and return JSON.

${SUFFICIENCY_RUBRIC}

Respond with ONLY a JSON object:
{
  "dimensions": [
    { "dimension": "Outcome Clarity", "score": 75, "feedback": "brief feedback" },
    ...
  ],
  "overallScore": 70,
  "isReady": false
}`,
    messages: [
      {
        role: 'user',
        content: `Narrative: ${input.narrative || '(empty)'}\n\nDocuments: ${input.documents.length} attached (${input.documents.map((d) => d.name).join(', ') || 'none'})`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  return JSON.parse(text);
}
