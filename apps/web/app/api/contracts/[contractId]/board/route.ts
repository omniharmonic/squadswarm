export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, contracts, workstreams, deliverables, files, squadMembers, users, agents } from '@squadswarm/db';
import { getSession } from '@/lib/auth';
import { getAgentSession } from '@/lib/agent-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string }> }
) {
  const session = await getSession();
  const agentSession = !session ? await getAgentSession(req) : null;
  if (!session && !agentSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { contractId } = await params;

  if (agentSession && agentSession.contractId !== contractId) {
    return NextResponse.json({ error: 'Token not valid for this contract' }, { status: 403 });
  }

  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth check for human users
  if (session) {
    const isClient = contract.clientId === session.userId;
    if (!isClient) {
      const [membership] = await db
        .select()
        .from(squadMembers)
        .where(and(eq(squadMembers.squadId, contract.squadId), eq(squadMembers.userId, session.userId)))
        .limit(1);
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // Fetch workstreams
  const allWorkstreams = await db
    .select()
    .from(workstreams)
    .where(eq(workstreams.contractId, contractId))
    .orderBy(workstreams.orderIndex);

  // Fetch all deliverables for this contract
  const allDeliverables = await db
    .select()
    .from(deliverables)
    .where(eq(deliverables.contractId, contractId));

  // Count files per deliverable
  const fileCounts: Record<string, number> = {};
  if (allDeliverables.length > 0) {
    const fileCountRows = await db
      .select({
        deliverableId: files.deliverableId,
        count: sql<number>`count(*)::int`,
      })
      .from(files)
      .where(eq(files.contractId, contractId))
      .groupBy(files.deliverableId);

    for (const row of fileCountRows) {
      if (row.deliverableId) fileCounts[row.deliverableId] = row.count;
    }
  }

  // Resolve assigned user/agent names
  const userIds = [...new Set(allDeliverables.map(d => d.assignedMemberId).filter(Boolean))] as string[];
  const agentIds = [...new Set(allDeliverables.map(d => d.assignedAgentId).filter(Boolean))] as string[];

  const userMap: Record<string, { displayName: string; avatarUrl: string | null }> = {};
  for (const uid of userIds) {
    const [u] = await db.select({ displayName: users.displayName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, uid)).limit(1);
    if (u) userMap[uid] = { displayName: u.displayName || 'Unknown', avatarUrl: u.avatarUrl };
  }

  const agentMap: Record<string, { name: string }> = {};
  for (const aid of agentIds) {
    const [a] = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, aid)).limit(1);
    if (a) agentMap[aid] = { name: a.name };
  }

  // Build response
  const wsData = allWorkstreams.map(ws => ({
    id: ws.id,
    title: ws.title,
    orderIndex: ws.orderIndex,
    status: ws.status,
    deliverables: allDeliverables
      .filter(d => d.workstreamId === ws.id)
      .map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        format: d.format,
        status: d.status,
        acceptanceCriteria: d.acceptanceCriteria,
        assignedMember: d.assignedMemberId && userMap[d.assignedMemberId]
          ? { id: d.assignedMemberId, displayName: userMap[d.assignedMemberId]!.displayName, avatarUrl: userMap[d.assignedMemberId]!.avatarUrl }
          : null,
        assignedAgent: d.assignedAgentId && agentMap[d.assignedAgentId]
          ? { id: d.assignedAgentId, name: agentMap[d.assignedAgentId]!.name }
          : null,
        estimatedEffortHours: d.estimatedEffortHours,
        dueDate: d.dueDate,
        fileCount: fileCounts[d.id] || 0,
      })),
  }));

  const allDels = wsData.flatMap(ws => ws.deliverables);
  const stats = {
    total: allDels.length,
    completed: allDels.filter(d => d.status === 'approved').length,
    inProgress: allDels.filter(d => d.status === 'in_progress').length,
    blocked: allDels.filter(d => d.status === 'blocked').length,
  };

  return NextResponse.json({
    workstreams: wsData,
    columns: ['not_started', 'in_progress', 'in_review', 'revision_requested', 'approved', 'blocked'],
    stats,
  });
}
