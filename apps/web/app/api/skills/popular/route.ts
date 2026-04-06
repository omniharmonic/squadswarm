export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { db, skills, userSkills } from '@squadswarm/db';
import { eq, desc, count } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '10')));

    const results = await db
      .select({
        id: skills.id,
        name: skills.name,
        slug: skills.slug,
        category: skills.category,
        usageCount: skills.usageCount,
        practitionerCount: count(userSkills.id),
      })
      .from(skills)
      .leftJoin(userSkills, eq(skills.id, userSkills.skillId))
      .groupBy(skills.id, skills.name, skills.slug, skills.category, skills.usageCount)
      .orderBy(desc(skills.usageCount), desc(count(userSkills.id)))
      .limit(limit);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Popular skills error:', error);
    return NextResponse.json({ error: 'Failed to fetch popular skills' }, { status: 500 });
  }
}
