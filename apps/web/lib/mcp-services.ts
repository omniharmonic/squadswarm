import { eq, and, desc } from 'drizzle-orm';
import { db, contracts, workstreams, deliverables, messages, activityLog, agents } from '@squadswarm/db';

export async function getAgentTasks(agentId: string, contractId: string) {
  const dels = await db.select().from(deliverables)
    .where(and(
      eq(deliverables.contractId, contractId),
      eq(deliverables.assignedAgentId, agentId)
    ));
  return dels;
}

export async function getProjectContext(contractId: string) {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId)).limit(1);
  if (!contract) return null;
  const ws = await db.select().from(workstreams).where(eq(workstreams.contractId, contractId));
  const dels = await db.select().from(deliverables).where(eq(deliverables.contractId, contractId));
  const contractAgents = await db.select().from(agents);
  // Filter agents to those assigned to deliverables in this contract
  const assignedAgentIds = new Set(dels.map(d => d.assignedAgentId).filter(Boolean));
  const teamAgents = contractAgents.filter(a => assignedAgentIds.has(a.id));
  return { contract, workstreams: ws, deliverables: dels, agents: teamAgents };
}

export async function updateDeliverableStatus(
  deliverableId: string,
  status: string,
  agentId: string,
  note?: string
) {
  const [updated] = await db.update(deliverables)
    .set({ status, updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  if (updated) {
    await db.insert(activityLog).values({
      contractId: updated.contractId,
      actorAgentId: agentId,
      action: 'deliverable_status_changed',
      entityType: 'deliverable',
      entityId: deliverableId,
      metadata: { newStatus: status, note, byAgent: true },
    });
  }
  return updated;
}

export async function flagBlocker(
  deliverableId: string,
  reason: string,
  agentId: string
) {
  const [updated] = await db.update(deliverables)
    .set({ status: 'blocked', updatedAt: new Date() })
    .where(eq(deliverables.id, deliverableId))
    .returning();

  if (updated) {
    await db.insert(activityLog).values({
      contractId: updated.contractId,
      actorAgentId: agentId,
      action: 'deliverable_blocked',
      entityType: 'deliverable',
      entityId: deliverableId,
      metadata: { reason, byAgent: true },
    });
  }
  return updated;
}

export async function postAgentMessage(
  contractId: string,
  channelType: string,
  channelId: string | null,
  content: string,
  agentId: string
) {
  const [msg] = await db.insert(messages).values({
    contractId,
    channelType,
    channelId,
    authorAgentId: agentId,
    content,
  }).returning();
  return msg;
}

export async function getContractMessages(
  contractId: string,
  channelType?: string,
  limit = 20
) {
  const allMsgs = await db.select().from(messages)
    .where(eq(messages.contractId, contractId))
    .orderBy(desc(messages.createdAt))
    .limit(limit);
  return channelType ? allMsgs.filter(m => m.channelType === channelType) : allMsgs;
}

export async function getDeliverableAcceptanceCriteria(deliverableId: string) {
  const [del] = await db.select().from(deliverables)
    .where(eq(deliverables.id, deliverableId))
    .limit(1);
  return {
    deliverableId,
    title: del?.title || null,
    criteria: del?.acceptanceCriteria || [],
  };
}

export async function submitDailyLog(
  contractId: string,
  agentId: string,
  summary: string,
  hoursWorked: number,
  deliverableIds: string[]
) {
  await db.insert(activityLog).values({
    contractId,
    actorAgentId: agentId,
    action: 'daily_log_submitted',
    entityType: 'contract',
    entityId: contractId,
    metadata: { summary, hoursWorked, deliverableIds, byAgent: true },
  });
  return { success: true };
}
