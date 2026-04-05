import Anthropic from '@anthropic-ai/sdk';
import { normalizeSkills, filterVagueSkills } from './skill-normalizer';
import type { NormalizedSkill } from './skill-normalizer';

function getClient() {
  return new Anthropic();
}

/**
 * Use Claude to extract required skills from a deliverable description.
 * Used for retroactive skill extraction on existing data without skills.
 */
export async function extractSkillsFromDeliverable(deliverable: {
  title: string;
  description?: string;
  format: string;
}): Promise<NormalizedSkill[]> {
  const client = getClient();

  const response = await client.messages.create({
    model: 'claude-3-haiku-20240307',
    max_tokens: 512,
    system: `You extract specific, industry-standard skills required to complete a deliverable.

Rules:
- Return exactly 2-5 skills as a JSON array of strings
- Skills must be specific technologies, tools, or methodologies (e.g., "React", "PostgreSQL", "Figma", "Technical Writing")
- Do NOT use vague terms like "development", "programming", "coding", "software engineering", "web development"
- Use canonical names: "React" not "React.js", "TypeScript" not "TS", "PostgreSQL" not "Postgres"
- Skills should be what someone needs to know to actually complete this deliverable
- Categories to draw from: Frontend, Backend, Design, Data, DevOps, AI/ML, Blockchain, Business, Writing

Respond with ONLY a JSON array of strings, no other text.`,
    messages: [
      {
        role: 'user',
        content: `Deliverable: ${deliverable.title}
${deliverable.description ? `Description: ${deliverable.description}` : ''}
Format: ${deliverable.format}

What specific skills are required to complete this deliverable?`,
      },
    ],
  });

  const text = response.content
    .filter((block: Anthropic.ContentBlock): block is Anthropic.TextBlock => block.type === 'text')
    .map((block: Anthropic.TextBlock) => block.text)
    .join('');

  try {
    const rawSkills: string[] = JSON.parse(text);
    if (!Array.isArray(rawSkills)) {
      return [];
    }
    const filtered = filterVagueSkills(rawSkills);
    // If all skills were filtered out, keep originals to avoid empty result
    const skillsToNormalize = filtered.length > 0 ? filtered : rawSkills;
    return normalizeSkills(skillsToNormalize);
  } catch {
    return [];
  }
}
