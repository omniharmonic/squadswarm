export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, scopes, squads, squadMembers, skills, userSkills } from '@squadswarm/db';
import { eq, inArray } from 'drizzle-orm';

interface WorkPlanDeliverable {
  requiredSkills?: string[];
  [key: string]: unknown;
}

interface WorkPlan {
  deliverables?: WorkPlanDeliverable[];
  [key: string]: unknown;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ scopeId: string }> }
) {
  try {
    const { scopeId } = await params;

    // Load scope and its work plan
    const [scope] = await db
      .select({ id: scopes.id, workPlan: scopes.workPlan })
      .from(scopes)
      .where(eq(scopes.id, scopeId))
      .limit(1);

    if (!scope) {
      return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
    }

    // Extract required skills from all deliverables
    const workPlan = scope.workPlan as WorkPlan | null;
    const allRequiredSkills = new Set<string>();

    if (workPlan?.deliverables) {
      for (const del of workPlan.deliverables) {
        if (Array.isArray(del.requiredSkills)) {
          for (const skill of del.requiredSkills) {
            allRequiredSkills.add(skill.toLowerCase().replace(/\s+/g, '-'));
          }
        }
      }
    }

    if (allRequiredSkills.size === 0) {
      return NextResponse.json({ squads: [] });
    }

    const requiredSkillSlugs = Array.from(allRequiredSkills);

    // Resolve skill slugs to IDs
    const skillRecords = await db
      .select({ id: skills.id, slug: skills.slug, name: skills.name })
      .from(skills)
      .where(inArray(skills.slug, requiredSkillSlugs));

    if (skillRecords.length === 0) {
      return NextResponse.json({ squads: [] });
    }

    const skillIdToSlug = new Map<string, string>(skillRecords.map((s) => [s.id, s.slug]));
    const skillSlugToName = new Map<string, string>(skillRecords.map((s) => [s.slug, s.name]));
    const skillIds = skillRecords.map((s) => s.id);

    // Find all users with those skills
    const usersWithSkills = await db
      .select({
        userId: userSkills.userId,
        skillId: userSkills.skillId,
      })
      .from(userSkills)
      .where(inArray(userSkills.skillId, skillIds));

    if (usersWithSkills.length === 0) {
      return NextResponse.json({ squads: [] });
    }

    const userIds = [...new Set(usersWithSkills.map((u) => u.userId))];

    // Find squads those users belong to
    const memberships = await db
      .select({
        squadId: squadMembers.squadId,
        userId: squadMembers.userId,
      })
      .from(squadMembers)
      .where(inArray(squadMembers.userId, userIds));

    // Build squad -> matched skills map
    const userSkillMap = new Map<string, Set<string>>();
    for (const us of usersWithSkills) {
      const slug = skillIdToSlug.get(us.skillId);
      if (!slug) continue;
      if (!userSkillMap.has(us.userId)) userSkillMap.set(us.userId, new Set());
      userSkillMap.get(us.userId)!.add(slug);
    }

    const squadMatchedSkills = new Map<string, Set<string>>();
    for (const m of memberships) {
      const memberSkills = userSkillMap.get(m.userId);
      if (!memberSkills) continue;
      if (!squadMatchedSkills.has(m.squadId)) squadMatchedSkills.set(m.squadId, new Set());
      for (const slug of memberSkills) {
        squadMatchedSkills.get(m.squadId)!.add(slug);
      }
    }

    // Get squad details
    const matchedSquadIds = Array.from(squadMatchedSkills.keys());
    if (matchedSquadIds.length === 0) {
      return NextResponse.json({ squads: [] });
    }

    const squadRecords = await db
      .select({
        id: squads.id,
        name: squads.name,
        slug: squads.slug,
        trustScore: squads.trustScore,
      })
      .from(squads)
      .where(inArray(squads.id, matchedSquadIds));

    // Get member counts
    const allMemberships = await db
      .select({ squadId: squadMembers.squadId })
      .from(squadMembers)
      .where(inArray(squadMembers.squadId, matchedSquadIds));

    const memberCountMap = new Map<string, number>();
    for (const m of allMemberships) {
      memberCountMap.set(m.squadId, (memberCountMap.get(m.squadId) ?? 0) + 1);
    }

    // Build results
    const results = squadRecords.map((squad) => {
      const matched = squadMatchedSkills.get(squad.id) ?? new Set();
      const matchedSlugs = Array.from(matched);
      const missingSlugs = requiredSkillSlugs.filter((s) => !matched.has(s));

      const matchScore = Math.round((matchedSlugs.length / requiredSkillSlugs.length) * 100);

      return {
        id: squad.id,
        name: squad.name,
        slug: squad.slug,
        trustScore: Number(squad.trustScore ?? 0),
        matchScore,
        matchedSkills: matchedSlugs.map((s) => skillSlugToName.get(s) ?? s),
        missingSkills: missingSlugs.map((s) => skillSlugToName.get(s) ?? s),
        memberCount: memberCountMap.get(squad.id) ?? 0,
      };
    });

    // Sort by match score desc, limit to top 10
    results.sort((a, b) => b.matchScore - a.matchScore || b.trustScore - a.trustScore);

    return NextResponse.json({ squads: results.slice(0, 10) });
  } catch (error) {
    console.error('Recommended squads error:', error);
    return NextResponse.json({ error: 'Failed to get recommended squads' }, { status: 500 });
  }
}
