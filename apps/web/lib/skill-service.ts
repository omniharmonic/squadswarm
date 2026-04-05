import { db, skills, userSkills, squadMembers } from '@squadswarm/db';
import { eq, and, sql, inArray } from 'drizzle-orm';

/**
 * Resolve skill slugs to skill records, creating new skills if they don't exist.
 * Uses upsert (ON CONFLICT DO NOTHING) to handle concurrent inserts safely.
 */
export async function resolveSkillSlugs(
  slugs: string[]
): Promise<Array<{ id: string; slug: string; name: string }>> {
  if (!slugs.length) return [];

  const resolved: Array<{ id: string; slug: string; name: string }> = [];

  for (const slug of slugs) {
    // Try to find existing skill
    const [existing] = await db
      .select({ id: skills.id, slug: skills.slug, name: skills.name })
      .from(skills)
      .where(eq(skills.slug, slug))
      .limit(1);

    if (existing) {
      resolved.push(existing);
      continue;
    }

    // Create new skill from slug — derive name from slug
    const name = slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const [created] = await db
      .insert(skills)
      .values({
        name,
        slug,
        category: 'other',
        description: `Auto-created skill: ${name}`,
      })
      .onConflictDoNothing({ target: skills.slug })
      .returning({ id: skills.id, slug: skills.slug, name: skills.name });

    if (created) {
      resolved.push(created);
    } else {
      // Race condition: another process created it between our select and insert
      const [raceResult] = await db
        .select({ id: skills.id, slug: skills.slug, name: skills.name })
        .from(skills)
        .where(eq(skills.slug, slug))
        .limit(1);
      if (raceResult) resolved.push(raceResult);
    }
  }

  return resolved;
}

/**
 * Determine proficiency level from attestation count.
 */
function proficiencyFromCount(count: number): 'demonstrated' | 'proficient' | 'expert' {
  if (count >= 6) return 'expert';
  if (count >= 3) return 'proficient';
  return 'demonstrated';
}

/**
 * Update a user's skill portfolio after a deliverable is completed.
 * Increments attestation counts and recalculates proficiency levels.
 */
export async function updateUserSkillPortfolio(
  userId: string,
  skillSlugs: string[],
  _contractId: string
): Promise<void> {
  if (!skillSlugs.length) return;

  const resolvedSkills = await resolveSkillSlugs(skillSlugs);

  for (const skill of resolvedSkills) {
    // Upsert user_skills: increment attestation count
    const [existing] = await db
      .select()
      .from(userSkills)
      .where(and(eq(userSkills.userId, userId), eq(userSkills.skillId, skill.id)))
      .limit(1);

    if (existing) {
      const newCount = existing.attestationCount + 1;
      await db
        .update(userSkills)
        .set({
          attestationCount: newCount,
          lastAttestedAt: new Date(),
          proficiencyLevel: proficiencyFromCount(newCount),
        })
        .where(eq(userSkills.id, existing.id));
    } else {
      await db.insert(userSkills).values({
        userId,
        skillId: skill.id,
        attestationCount: 1,
        lastAttestedAt: new Date(),
        proficiencyLevel: 'demonstrated',
      });
    }

    // Increment skill usage count
    await db
      .update(skills)
      .set({ usageCount: sql`${skills.usageCount} + 1` })
      .where(eq(skills.id, skill.id));
  }
}

/**
 * Get aggregated skill matrix for a squad (all members' skills).
 */
export async function getSquadSkillMatrix(
  squadId: string
): Promise<
  Array<{
    skillName: string;
    skillSlug: string;
    category: string;
    memberCount: number;
    totalAttestations: number;
  }>
> {
  // Get all squad member user IDs
  const members = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(eq(squadMembers.squadId, squadId));

  const memberIds = members.map((m) => m.userId);
  if (!memberIds.length) return [];

  // Get all user_skills for these members, joined with skills
  const rows = await db
    .select({
      skillName: skills.name,
      skillSlug: skills.slug,
      category: skills.category,
      userId: userSkills.userId,
      attestationCount: userSkills.attestationCount,
    })
    .from(userSkills)
    .innerJoin(skills, eq(userSkills.skillId, skills.id))
    .where(inArray(userSkills.userId, memberIds));

  // Aggregate by skill
  const skillMap = new Map<
    string,
    { skillName: string; skillSlug: string; category: string; memberCount: number; totalAttestations: number }
  >();

  for (const row of rows) {
    const existing = skillMap.get(row.skillSlug);
    if (existing) {
      existing.memberCount += 1;
      existing.totalAttestations += row.attestationCount;
    } else {
      skillMap.set(row.skillSlug, {
        skillName: row.skillName,
        skillSlug: row.skillSlug,
        category: row.category,
        memberCount: 1,
        totalAttestations: row.attestationCount,
      });
    }
  }

  return Array.from(skillMap.values()).sort((a, b) => b.totalAttestations - a.totalAttestations);
}
