export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { randomBytes, createHash } from 'crypto';
import { db, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();

    // Generate API key and store SHA-256 hash
    const apiKey = randomBytes(32).toString('hex');
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const [agent] = await db
      .insert(agents)
      .values({
        ownerId: session.userId,
        name: body.name,
        description: body.description,
        provider: body.provider,
        model: body.model,
        connectionType: body.connectionType,
        mcpEndpoint: body.mcpEndpoint,
        capabilities: body.capabilities || [],
        apiKeyHash,
      })
      .returning();

    // Return the plain API key only on creation — it won't be retrievable later
    return NextResponse.json({ ...agent, apiKey }, { status: 201 });
  } catch (error) {
    console.error('Create agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userAgents = await db
    .select()
    .from(agents)
    .where(eq(agents.ownerId, session.userId))
    .orderBy(desc(agents.createdAt));

  return NextResponse.json(userAgents);
}
