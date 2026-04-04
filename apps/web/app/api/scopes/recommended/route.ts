export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, and, inArray } from 'drizzle-orm';
import { db, scopes, contracts, squadMembers } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // 1. Get user's squads
  const memberships = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .where(eq(squadMembers.userId, session.userId));

  const squadIds = memberships.map((m) => m.squadId);
  if (squadIds.length === 0) {
    return NextResponse.json([]);
  }

  // 2. Get completed contracts for those squads to find category expertise
  const completedContracts = await db
    .select({ scopeId: contracts.scopeId })
    .from(contracts)
    .where(
      and(
        inArray(contracts.squadId, squadIds),
        eq(contracts.status, 'completed')
      )
    );

  // 3. Gather category tags from completed scope work
  const completedScopeIds = completedContracts.map((c) => c.scopeId);
  const expertiseTags = new Set<string>();

  if (completedScopeIds.length > 0) {
    const completedScopes = await db
      .select({ categoryTags: scopes.categoryTags })
      .from(scopes)
      .where(inArray(scopes.id, completedScopeIds));

    for (const s of completedScopes) {
      const tags = s.categoryTags as string[] | null;
      if (tags) tags.forEach((t) => expertiseTags.add(t.toLowerCase()));
    }
  }

  // 4. Get all open scopes
  const openScopes = await db
    .select({
      id: scopes.id,
      title: scopes.title,
      categoryTags: scopes.categoryTags,
      budgetMin: scopes.budgetMin,
      budgetMax: scopes.budgetMax,
      timelineDays: scopes.timelineDays,
    })
    .from(scopes)
    .where(eq(scopes.status, 'open'));

  if (openScopes.length === 0) {
    return NextResponse.json([]);
  }

  // 5. Score each scope based on category overlap
  const scored = openScopes.map((scope) => {
    const tags = (scope.categoryTags as string[] | null) ?? [];
    const lowerTags = tags.map((t) => t.toLowerCase());

    let matchCount = 0;
    for (const tag of lowerTags) {
      if (expertiseTags.has(tag)) matchCount++;
    }

    // Match score: percentage of scope tags that match squad expertise
    // If squad has no completed contracts, use a base heuristic of 50%
    const matchScore =
      expertiseTags.size === 0
        ? 50
        : lowerTags.length > 0
          ? Math.round((matchCount / lowerTags.length) * 100)
          : 30;

    return {
      id: scope.id,
      title: scope.title,
      categoryTags: scope.categoryTags,
      budgetMin: scope.budgetMin,
      budgetMax: scope.budgetMax,
      matchScore,
    };
  });

  // 6. Sort by match score descending, return top 5
  scored.sort((a, b) => b.matchScore - a.matchScore);
  const top5 = scored.slice(0, 5);

  return NextResponse.json(top5);
}
