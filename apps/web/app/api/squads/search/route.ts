export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, squads, squadMembers, skills, userSkills, contracts } from '@squadswarm/db';
import { eq, ilike, gte, or, and, inArray, count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const skillSlugs = url.searchParams.get('skills')?.split(',').filter(Boolean) ?? [];
    const category = url.searchParams.get('category') || null;
    const query = url.searchParams.get('q') || null;
    const minScore = url.searchParams.get('minScore') ? Number(url.searchParams.get('minScore')) : null;
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '10')));

    // Step 1: Get all squads, filtered by text search and trust score
    let squadQuery = db
      .select({
        id: squads.id,
        name: squads.name,
        slug: squads.slug,
        bio: squads.bio,
        trustScore: squads.trustScore,
      })
      .from(squads)
      .$dynamic();

    const conditions = [];
    if (query) {
      conditions.push(
        or(
          ilike(squads.name, `%${query}%`),
          ilike(squads.bio, `%${query}%`)
        )
      );
    }
    if (minScore != null) {
      conditions.push(gte(squads.trustScore, String(minScore)));
    }

    if (conditions.length > 0) {
      for (const cond of conditions) {
        if (cond) {
          squadQuery = squadQuery.where(cond);
        }
      }
    }

    const allSquads = await squadQuery;

    if (allSquads.length === 0) {
      return NextResponse.json({
        squads: [],
        pagination: { page, limit, total: 0, hasMore: false },
        filters: { skills: skillSlugs, category, query },
      });
    }

    const squadIds = allSquads.map((s) => s.id);

    // Step 2: Get member counts per squad
    const memberCounts = await db
      .select({
        squadId: squadMembers.squadId,
        memberCount: count(squadMembers.id),
      })
      .from(squadMembers)
      .where(inArray(squadMembers.squadId, squadIds))
      .groupBy(squadMembers.squadId);

    const memberCountMap = new Map<string, number>(memberCounts.map((m) => [m.squadId, Number(m.memberCount)]));

    // Step 3: Get completed contract counts per squad
    const contractCounts = await db
      .select({
        squadId: contracts.squadId,
        completedCount: count(contracts.id),
      })
      .from(contracts)
      .where(
        and(
          inArray(contracts.squadId, squadIds),
          eq(contracts.status, 'completed')
        )
      )
      .groupBy(contracts.squadId);

    const contractCountMap = new Map<string, number>(contractCounts.map((c) => [c.squadId, Number(c.completedCount)]));

    // Step 4: Get all member skill data for these squads
    const memberSkillRows = await db
      .select({
        squadId: squadMembers.squadId,
        userId: squadMembers.userId,
        skillName: skills.name,
        skillSlug: skills.slug,
        skillCategory: skills.category,
        attestationCount: userSkills.attestationCount,
      })
      .from(squadMembers)
      .innerJoin(userSkills, eq(squadMembers.userId, userSkills.userId))
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(inArray(squadMembers.squadId, squadIds));

    // Step 5: Aggregate skills per squad
    type SquadSkillAgg = {
      name: string;
      slug: string;
      category: string;
      memberCount: number;
      totalAttestations: number;
      members: Set<string>;
    };

    const squadSkillMap = new Map<string, Map<string, SquadSkillAgg>>();

    for (const row of memberSkillRows) {
      if (!squadSkillMap.has(row.squadId)) {
        squadSkillMap.set(row.squadId, new Map());
      }
      const skillMap = squadSkillMap.get(row.squadId)!;
      const existing = skillMap.get(row.skillSlug);
      if (existing) {
        if (!existing.members.has(row.userId)) {
          existing.memberCount += 1;
          existing.members.add(row.userId);
        }
        existing.totalAttestations += row.attestationCount;
      } else {
        skillMap.set(row.skillSlug, {
          name: row.skillName,
          slug: row.skillSlug,
          category: row.skillCategory,
          memberCount: 1,
          totalAttestations: row.attestationCount,
          members: new Set([row.userId]),
        });
      }
    }

    // Step 6: Filter by category if provided
    let filteredSquadIds = squadIds;
    if (category) {
      filteredSquadIds = squadIds.filter((sid) => {
        const skillMap = squadSkillMap.get(sid);
        if (!skillMap) return false;
        return Array.from(skillMap.values()).some((s) => s.category === category);
      });
    }

    // Step 7: Filter by skills and calculate match scores
    const hasSkillFilter = skillSlugs.length > 0;

    type SquadResult = {
      id: string;
      name: string;
      slug: string;
      description: string | null;
      trustScore: number;
      memberCount: number;
      skills: Array<{ name: string; slug: string; category: string; memberCount: number; totalAttestations: number }>;
      matchScore: number;
      completedContracts: number;
    };

    const results: SquadResult[] = [];

    for (const sid of filteredSquadIds) {
      const squad = allSquads.find((s) => s.id === sid);
      if (!squad) continue;

      const skillMap = squadSkillMap.get(sid);
      const squadSkills = skillMap
        ? Array.from(skillMap.values()).map(({ members: _m, ...rest }) => rest)
        : [];

      const trustScore = Number(squad.trustScore ?? 0);

      let matchScore = 0;

      if (hasSkillFilter) {
        // Calculate match score based on skill coverage
        const squadSkillSlugs = new Set(squadSkills.map((s) => s.slug));
        let matchedCount = 0;
        let attestationBonus = 0;

        for (const slug of skillSlugs) {
          if (squadSkillSlugs.has(slug)) {
            matchedCount += 1;
            const skill = squadSkills.find((s) => s.slug === slug);
            if (skill) {
              // Higher attestations = better match
              attestationBonus += Math.min(skill.totalAttestations * 2, 10);
            }
          }
        }

        if (matchedCount === 0) continue; // Skip squads with zero matching skills

        const coveragePercent = (matchedCount / skillSlugs.length) * 100;
        // Base: coverage percentage (0-80), attestation bonus (0-10), trust bonus (0-10)
        matchScore = Math.round(
          coveragePercent * 0.8 +
          Math.min(attestationBonus, 10) +
          (trustScore / 100) * 10
        );
        matchScore = Math.min(100, matchScore);
      } else {
        // No skill filter - score based on trust + skills breadth
        matchScore = Math.round(
          Math.min(squadSkills.length * 3, 40) +
          (trustScore / 100) * 40 +
          Math.min((memberCountMap.get(sid) ?? 0) * 5, 20)
        );
        matchScore = Math.min(100, matchScore);
      }

      results.push({
        id: squad.id,
        name: squad.name,
        slug: squad.slug,
        description: squad.bio,
        trustScore,
        memberCount: memberCountMap.get(sid) ?? 0,
        skills: squadSkills.sort((a, b) => b.totalAttestations - a.totalAttestations),
        matchScore,
        completedContracts: contractCountMap.get(sid) ?? 0,
      });
    }

    // Sort by match score desc, then trust score desc
    results.sort((a, b) => b.matchScore - a.matchScore || b.trustScore - a.trustScore);

    // Paginate
    const total = results.length;
    const offset = (page - 1) * limit;
    const paginatedResults = results.slice(offset, offset + limit);

    return NextResponse.json({
      squads: paginatedResults,
      pagination: { page, limit, total, hasMore: offset + limit < total },
      filters: { skills: skillSlugs, category, query },
    });
  } catch (error) {
    console.error('Squad search error:', error);
    return NextResponse.json({ error: 'Failed to search squads' }, { status: 500 });
  }
}
