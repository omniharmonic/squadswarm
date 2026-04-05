export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc, and } from 'drizzle-orm';
import { db, skills, userSkills, users, attestations, deliverables, contracts, squads } from '@squadswarm/db';

/**
 * GET /api/skills/[skillSlug]
 * Skill detail: info, top practitioners, recent contracts.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ skillSlug: string }> }
) {
  const { skillSlug } = await params;

  try {
    // Find the skill
    const [skill] = await db
      .select()
      .from(skills)
      .where(eq(skills.slug, skillSlug))
      .limit(1);

    if (!skill) {
      return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
    }

    // Top 10 practitioners by attestation count
    const topPractitioners = await db
      .select({
        userId: userSkills.userId,
        displayName: users.displayName,
        attestationCount: userSkills.attestationCount,
        proficiencyLevel: userSkills.proficiencyLevel,
      })
      .from(userSkills)
      .innerJoin(users, eq(userSkills.userId, users.id))
      .where(eq(userSkills.skillId, skill.id))
      .orderBy(desc(userSkills.attestationCount))
      .limit(10);

    // Last 5 contracts that required this skill (via skill_verification attestations)
    const recentSkillAttestations = await db
      .select({
        contractId: attestations.contractId,
        data: attestations.data,
        createdAt: attestations.createdAt,
      })
      .from(attestations)
      .where(
        and(
          eq(attestations.type, 'skill_verification'),
          eq(attestations.schemaUid, 'SKILL_VERIFICATION')
        )
      )
      .orderBy(desc(attestations.createdAt))
      .limit(50); // Fetch more, filter by skill slug

    // Filter to this skill and deduplicate by contractId
    const seenContracts = new Set<string>();
    const recentContractAttestations = recentSkillAttestations
      .filter((a) => {
        const data = a.data as Record<string, unknown> | null;
        return data?.slug === skillSlug;
      })
      .filter((a) => {
        if (!a.contractId || seenContracts.has(a.contractId)) return false;
        seenContracts.add(a.contractId);
        return true;
      })
      .slice(0, 5);

    // Enrich with contract/squad info
    const recentContracts = await Promise.all(
      recentContractAttestations.map(async (a) => {
        const data = a.data as Record<string, unknown>;
        let squadName = 'Unknown Squad';

        if (a.contractId) {
          const [contract] = await db
            .select({ squadId: contracts.squadId })
            .from(contracts)
            .where(eq(contracts.id, a.contractId))
            .limit(1);

          if (contract) {
            const [squad] = await db
              .select({ name: squads.name })
              .from(squads)
              .where(eq(squads.id, contract.squadId))
              .limit(1);
            if (squad) squadName = squad.name;
          }
        }

        return {
          contractId: a.contractId,
          deliverableTitle: (data?.deliverableTitle as string) || 'Unknown',
          completedAt: a.createdAt?.toISOString() ?? null,
          squadName,
        };
      })
    );

    return NextResponse.json({
      skill: {
        id: skill.id,
        name: skill.name,
        slug: skill.slug,
        category: skill.category,
        description: skill.description,
        usageCount: skill.usageCount,
      },
      topPractitioners: topPractitioners.map((p) => ({
        userId: p.userId,
        displayName: p.displayName || 'Anonymous',
        attestationCount: p.attestationCount,
        proficiencyLevel: p.proficiencyLevel,
      })),
      recentContracts,
    });
  } catch (error) {
    console.error('Get skill detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
