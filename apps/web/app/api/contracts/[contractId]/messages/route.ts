export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { db, contracts, messages, squadMembers, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getAgentSession } from '@/lib/agent-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId } = await params;
  const { searchParams } = new URL(req.url);
  const channelType = searchParams.get('channelType');
  const channelId = searchParams.get('channelId');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth check
  const isClient = contract.clientId === session.userId;
  if (!isClient) {
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Build conditions
  const conditions = [eq(messages.contractId, contractId)];
  if (channelType) conditions.push(eq(messages.channelType, channelType));
  if (channelId) conditions.push(eq(messages.channelId, channelId));

  const rows = await db
    .select()
    .from(messages)
    .where(and(...conditions))
    .orderBy(asc(messages.createdAt))
    .limit(limit)
    .offset(offset);

  // Resolve author names
  const userIds = [...new Set(rows.filter(m => m.authorUserId).map(m => m.authorUserId!))];
  const authorNames: Record<string, { name: string; isAgent: boolean }> = {};

  for (const uid of userIds) {
    const [u] = await db.select({ displayName: users.displayName, email: users.email }).from(users).where(eq(users.id, uid)).limit(1);
    if (u) authorNames[uid] = { name: u.displayName || u.email || 'Unknown', isAgent: false };
  }

  // For agent-authored messages, use authorAgentId
  const agentIds = [...new Set(rows.filter(m => m.authorAgentId).map(m => m.authorAgentId!))];
  for (const aid of agentIds) {
    // We import agents dynamically to keep imports clean
    const { agents } = await import('@squadswarm/db');
    const [a] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, aid)).limit(1);
    if (a) authorNames[aid] = { name: a.name, isAgent: true };
  }

  const enriched = rows.map(m => ({
    ...m,
    author: m.authorAgentId
      ? authorNames[m.authorAgentId]?.name || 'Unknown Agent'
      : m.authorUserId
        ? authorNames[m.authorUserId]?.name || 'Unknown'
        : 'System',
    isAgent: m.authorAgentId
      ? true
      : false,
  }));

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(...conditions));

  return NextResponse.json({
    messages: enriched,
    pagination: {
      page,
      limit,
      total: countResult?.count ?? 0,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  // Support both human session auth and agent token auth
  const session = await getSession();
  const agentSession = !session ? await getAgentSession(req) : null;

  if (!session && !agentSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contractId } = await params;

  // Agent tokens are scoped to a specific contract
  if (agentSession && agentSession.contractId !== contractId) {
    return NextResponse.json({ error: 'Agent token not valid for this contract' }, { status: 403 });
  }

  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: human must be contract participant
  if (session) {
    const isClient = contract.clientId === session.userId;
    if (!isClient) {
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
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }
  }

  const body = await req.json();
  const { content, channelType, channelId, mentions } = body;

  if (!content?.trim()) {
    return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
  }

  if (!channelType) {
    return NextResponse.json({ error: 'channelType is required' }, { status: 400 });
  }

  const [message] = await db
    .insert(messages)
    .values({
      contractId,
      channelType,
      channelId: channelId || null,
      authorUserId: session?.userId || null,
      authorAgentId: agentSession?.agentId || null,
      content: content.trim(),
      mentions: mentions || [],
    })
    .returning();

  // Resolve author name for response
  let authorName = 'Unknown';
  let isAgent = false;

  if (session) {
    const [user] = await db
      .select({ displayName: users.displayName, email: users.email })
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);
    authorName = user?.displayName || user?.email || 'Unknown';
  } else if (agentSession) {
    const [agent] = await db
      .select({ name: agents.name })
      .from(agents)
      .where(eq(agents.id, agentSession.agentId))
      .limit(1);
    authorName = agent?.name || 'Unknown Agent';
    isAgent = true;
  }

  return NextResponse.json({
    ...message,
    author: authorName,
    isAgent,
  }, { status: 201 });
}
