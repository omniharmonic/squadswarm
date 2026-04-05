export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { db, userSkills, skills, attestations } from '@squadswarm/db';

/**
 * GET /api/users/[userId]/skills
 * Returns a user's skill portfolio — public endpoint (no auth required).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    // Join user_skills with skills table
    const userSkillRows = await db
      .select({
        skillId: skills.id,
        skillName: skills.name,
        skillSlug: skills.slug,
        category: skills.category,
        attestationCount: userSkills.attestationCount,
        proficiencyLevel: userSkills.proficiencyLevel,
        lastAttestedAt: userSkills.lastAttestedAt,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId))
      .orderBy(desc(userSkills.attestationCount));

    // For each skill, fetch up to 3 recent skill_verification attestations as evidence
    const result = await Promise.all(
      userSkillRows.map(async (row) => {
        const recentAttestations = await db
          .select({
            contractId: attestations.contractId,
            data: attestations.data,
            createdAt: attestations.createdAt,
          })
          .from(attestations)
          .where(eq(attestations.userId, userId))
          .orderBy(desc(attestations.createdAt))
          .limit(20); // Fetch more, then filter by skill in JS

        // Filter to this specific skill
        const skillAttestations = recentAttestations
          .filter((a) => {
            const data = a.data as Record<string, unknown> | null;
            return (
              data?.slug === row.skillSlug ||
              data?.skill === row.skillName
            );
          })
          .slice(0, 3);

        const recentContracts = skillAttestations.map((a) => ({
          contractId: a.contractId,
          deliverableTitle: (a.data as Record<string, unknown>)?.deliverableTitle as string || 'Unknown',
          completedAt: a.createdAt?.toISOString() ?? null,
        }));

        return {
          skillId: row.skillId,
          skillName: row.skillName,
          skillSlug: row.skillSlug,
          category: row.category,
          attestationCount: row.attestationCount,
          proficiencyLevel: row.proficiencyLevel,
          lastAttestedAt: row.lastAttestedAt?.toISOString() ?? null,
          recentContracts,
        };
      })
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get user skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
