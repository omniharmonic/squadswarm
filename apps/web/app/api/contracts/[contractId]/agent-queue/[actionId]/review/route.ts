export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and } from 'drizzle-orm';
import { db, contracts, agentActionQueue, agents, squadMembers, deliverables, activityLog, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contractId: string; actionId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { contractId, actionId } = await params;

  // Load contract
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId))
    .limit(1);

  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 });

  // Auth: must be squad admin
  const [membership] = await db
    .select()
    .from(squadMembers)
    .where(
      and(
        eq(squadMembers.squadId, contract.squadId),
        eq(squadMembers.userId, session.userId),
        eq(squadMembers.role, 'admin')
      )
    )
    .limit(1);

  if (!membership) {
    return NextResponse.json({ error: 'Forbidden: must be a squad admin' }, { status: 403 });
  }

  // Parse body
  let body: { decision: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { decision, note } = body;

  if (decision !== 'approved' && decision !== 'rejected') {
    return NextResponse.json(
      { error: 'decision must be "approved" or "rejected"' },
      { status: 400 }
    );
  }

  // Load queue entry
  const [entry] = await db
    .select()
    .from(agentActionQueue)
    .where(
      and(
        eq(agentActionQueue.id, actionId),
        eq(agentActionQueue.contractId, contractId)
      )
    )
    .limit(1);

  if (!entry) return NextResponse.json({ error: 'Action not found' }, { status: 404 });

  if (entry.status !== 'pending') {
    return NextResponse.json(
      { error: `Action already ${entry.status}` },
      { status: 409 }
    );
  }

  // Update the queue entry
  const [updated] = await db
    .update(agentActionQueue)
    .set({
      status: decision,
      reviewedBy: session.userId,
      reviewedAt: new Date(),
      reviewNote: note || null,
    })
    .where(eq(agentActionQueue.id, actionId))
    .returning();

  const payload = entry.actionPayload as Record<string, unknown> | null;

  // Execute approved actions
  if (decision === 'approved') {
    try {
      switch (entry.actionType) {
        case 'submit_deliverable': {
          const deliverableId = payload?.deliverableId as string | undefined;
          if (deliverableId) {
            await db
              .update(deliverables)
              .set({ status: 'in_review', updatedAt: new Date() })
              .where(
                and(
                  eq(deliverables.id, deliverableId),
                  eq(deliverables.contractId, contractId)
                )
              );
          }
          break;
        }
        case 'upload_final_file': {
          const deliverableId = payload?.deliverableId as string | undefined;
          const fileId = payload?.fileId as string | undefined;
          if (deliverableId) {
            await db
              .update(deliverables)
              .set({ status: 'in_review', updatedAt: new Date() })
              .where(
                and(
                  eq(deliverables.id, deliverableId),
                  eq(deliverables.contractId, contractId)
                )
              );
          }
          // Mark file as final submission if fileId provided
          if (fileId) {
            // Import files inline to avoid unused import when not needed
            const { files } = await import('@squadswarm/db');
            await db
              .update(files)
              .set({ isFinalSubmission: true })
              .where(eq(files.id, fileId));
          }
          break;
        }
        case 'propose_approach': {
          // Informational: store in activity log
          await db.insert(activityLog).values({
            contractId,
            actorAgentId: entry.agentId,
            action: 'approach_proposed',
            entityType: 'agent_action',
            entityId: entry.id,
            metadata: payload,
          });
          break;
        }
        default: {
          // Unknown action type — just log it
          await db.insert(activityLog).values({
            contractId,
            actorAgentId: entry.agentId,
            action: `custom_action_approved`,
            entityType: 'agent_action',
            entityId: entry.id,
            metadata: { actionType: entry.actionType, ...((payload as object) || {}) },
          });
          break;
        }
      }
    } catch (error) {
      console.error('Error executing approved action:', error);
      // Still mark as approved but log the execution failure
      await db.insert(activityLog).values({
        contractId,
        actorUserId: session.userId,
        action: 'agent_action_execution_failed',
        entityType: 'agent_action',
        entityId: entry.id,
        metadata: { error: String(error), actionType: entry.actionType },
      });
    }
  }

  // Log the review activity
  await db.insert(activityLog).values({
    contractId,
    actorUserId: session.userId,
    action: 'agent_action_reviewed',
    entityType: 'agent_action',
    entityId: entry.id,
    metadata: { decision, actionType: entry.actionType, note: note || null },
  });

  // If rejected, notify the agent owner
  if (decision === 'rejected') {
    const [agent] = await db
      .select({ ownerId: agents.ownerId, name: agents.name })
      .from(agents)
      .where(eq(agents.id, entry.agentId))
      .limit(1);

    if (agent) {
      await db.insert(notifications).values({
        userId: agent.ownerId,
        type: 'agent_action_rejected',
        title: `Action by "${agent.name}" was rejected`,
        body: note || `The ${entry.actionType} action was rejected by a squad admin.`,
        metadata: { contractId, agentId: entry.agentId, actionId: entry.id },
      });
    }
  }

  return NextResponse.json(updated);
}
