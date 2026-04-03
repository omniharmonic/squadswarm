export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;

  const [agent] = await db
    .select()
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

  return NextResponse.json(agent);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, session.userId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 });

  try {
    const body = await req.json();
    const allowedFields: Record<string, unknown> = {};

    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.description !== undefined) allowedFields.description = body.description;
    if (body.provider !== undefined) allowedFields.provider = body.provider;
    if (body.model !== undefined) allowedFields.model = body.model;
    if (body.connectionType !== undefined) allowedFields.connectionType = body.connectionType;
    if (body.mcpEndpoint !== undefined) allowedFields.mcpEndpoint = body.mcpEndpoint;
    if (body.capabilities !== undefined) allowedFields.capabilities = body.capabilities;
    if (body.status !== undefined) allowedFields.status = body.status;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(agents)
      .set(allowedFields)
      .where(eq(agents.id, agentId))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { agentId } = await params;

  // Verify ownership
  const [existing] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, agentId), eq(agents.ownerId, session.userId)))
    .limit(1);

  if (!existing) return NextResponse.json({ error: 'Not found or not owner' }, { status: 404 });

  await db.delete(agents).where(eq(agents.id, agentId));

  return NextResponse.json({ success: true });
}
