export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { db, skills, userSkills } from '@squadswarm/db';

/**
 * GET /api/skills
 * List all skills with optional category filter and search.
 * Query params: ?category=frontend&search=react
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search');

    // Build conditions
    const conditions: ReturnType<typeof eq>[] = [];
    if (category) {
      conditions.push(eq(skills.category, category));
    }
    if (search) {
      conditions.push(ilike(skills.name, `%${search}%`));
    }

    // Query skills with user count subquery
    let query = db
      .select({
        id: skills.id,
        name: skills.name,
        slug: skills.slug,
        category: skills.category,
        description: skills.description,
        usageCount: skills.usageCount,
        practitionerCount: sql<number>`(
          SELECT COUNT(DISTINCT ${userSkills.userId})
          FROM ${userSkills}
          WHERE ${userSkills.skillId} = ${skills.id}
        )`.as('practitioner_count'),
      })
      .from(skills)
      .orderBy(desc(skills.usageCount))
      .$dynamic();

    // Apply filters
    if (conditions.length === 1) {
      query = query.where(conditions[0]!);
    } else if (conditions.length === 2) {
      query = query.where(and(conditions[0]!, conditions[1]!));
    }

    const allSkills = await query;

    return NextResponse.json({
      skills: allSkills,
      total: allSkills.length,
    });
  } catch (error) {
    console.error('List skills error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
