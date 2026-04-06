export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc } from 'drizzle-orm';
import { db, contracts, agentActionQueue, agents, squadMembers, deliverables } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { jwtVerify } from 'jose';
import { notifyMany } from '@/lib/notify';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-me');

/** Human-readable description for a queued action */
function describeAction(actionType: string, payload: Record<string, unknown> | null): string {
  switch (actionType) {
    case 'submit_deliverable':
      return `Submit deliverable "${payload?.deliverableTitle || payload?.deliverableId || 'unknown'}" for review`;
    case 'upload_final_file':
      return `Upload final file "${payload?.fileName || 'unknown'}" for deliverable "${payload?.deliverableTitle || payload?.deliverableId || 'unknown'}"`;
    case 'propose_approach':
      return `Propose approach: ${payload?.summary || payload?.approach || 'details in payload'}`;
    default:
      return `${actionType}: ${JSON.stringify(payload || {})}`;
  }
}

// ── GET: List queued actions for a contract ──────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;

  // Load contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: must be squad member (admin or member)
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, session.userId)
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: must be a squad member' }, { status: 403 });
  }

  // Query params
  const url = new URL(req.url);
  const statusFilter = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);

  // Build conditions
  const conditions = [eq(agentActionQueue.contractId, contractId)];
  if (statusFilter) {
    conditions.push(eq(agentActionQueue.status, statusFilter));
  }

  const rows = await db
    .select()
    .from(agentActionQueue)
    .where(and(...conditions))
    .orderBy(desc(agentActionQueue.createdAt))
    .limit(limit);

  // Resolve agent info
  const agentIds = [...new Set(rows.map(r => r.agentId))];
  const agentMap: Record<string, { name: string; provider: string; model: string }> = {};

  for (const aid of agentIds) {
    const [a] = await db
      .select({ name: agents.name, provider: agents.provider, model: agents.model })
      .from(agents)
      .where(eq(agents.id, aid))
      .limit(1);
    if (a) agentMap[aid] = a;
  }

  const enriched = rows.map(r => ({
    ...r,
    agent: agentMap[r.agentId] || null,
    description: describeAction(r.actionType, r.actionPayload as Record<string, unknown> | null),
  }));

  return NextResponse.json(enriched);
}

// ── POST: Enqueue a new agent action ─────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const { contractId } = await params;

  // Auth: session or agent token
  let authenticatedAgentId: string | null = null;
  let authenticatedUserId: string | null = null;

  const session = await getSession().catch(() => null);
  if (session) {
    authenticatedUserId = session.userId;
  }

  if (!authenticatedUserId) {
    // Try Bearer token auth (agent token from MCP server)
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const { payload } = await jwtVerify(token, JWT_SECRET);
        if (payload.agentId) {
          authenticatedAgentId = payload.agentId as string;
        }
      } catch {
        // Invalid token
      }
    }
  }

  if (!authenticatedUserId && !authenticatedAgentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse body
  let body: { agentId: string; actionType: string; actionPayload?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { agentId, actionType, actionPayload } = body;

  if (!agentId || !actionType) {
    return NextResponse.json({ error: 'agentId and actionType are required' }, { status: 400 });
  }

  // If agent token auth, ensure the token's agentId matches
  if (authenticatedAgentId && authenticatedAgentId !== agentId) {
    return NextResponse.json({ error: 'Agent token does not match agentId' }, { status: 403 });
  }

  // Load contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // If session auth, verify the user owns the agent
  if (authenticatedUserId) {
    const [agent] = await db
      .select()
      .from(agents)
      .where(and(eq(agents.id, agentId), eq(agents.ownerId, authenticatedUserId)))
      .limit(1);

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found or you are not the owner' }, { status: 403 });
    }
  }

  // Verify agent is assigned to a deliverable in this contract
  const [assignedDeliverable] = await db
    .select()
    .from(deliverables)
    .where(
      and(
        eq(deliverables.contractId, contractId),
        eq(deliverables.assignedAgentId, agentId)
      )
    )
    .limit(1);

  if (!assignedDeliverable) {
    return NextResponse.json(
      { error: 'Agent is not assigned to any deliverable in this contract' },
      { status: 403 }
    );
  }

  // Load agent info for notification
  const [agentInfo] = await db
    .select({ name: agents.name })
    .from(agents)
    .where(eq(agents.id, agentId))
    .limit(1);

  // Insert queue entry
  const entries = await db
    .insert(agentActionQueue)
    .values({
      contractId,
      agentId,
      actionType,
      actionPayload: actionPayload || null,
      status: 'pending',
    })
    .returning();

  const entry = entries[0]!;

  // Notify squad admins
  const admins = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.role, 'admin')
      )
    );

  const actionDesc = describeAction(actionType, actionPayload || null);

  if (admins.length > 0) {
    await notifyMany(
      admins.map(a => a.userId),
      {
        type: 'agent_action_pending',
        title: `Agent "${agentInfo?.name || 'Unknown'}" requests approval`,
        body: actionDesc,
        metadata: { contractId, agentId, actionId: entry.id, actionType },
      }
    );
  }

  return NextResponse.json(entry, { status: 201 });
}
