export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db, bids, scopes, contracts, workstreams, deliverables } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

interface WorkPlanDeliverable {
  title: string;
  description?: string;
  format: string;
  acceptanceCriteria?: unknown;
  assignedMemberId?: string;
  assignedAgentId?: string;
  estimatedEffortHours?: number;
  dueDate?: string;
}

interface WorkPlanWorkstream {
  title: string;
  description?: string;
  orderIndex?: number;
  dependencies?: string[];
  startDate?: string;
  endDate?: string;
  deliverables?: WorkPlanDeliverable[];
}

interface WorkPlan {
  workstreams?: WorkPlanWorkstream[];
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  // Fetch the bid
  const [bid] = await db
    .select()
    .from(bids)
    .where(eq(bids.id, bidId))
    .limit(1);

  if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

  // Fetch the scope and verify the caller is the client
  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.id, bid.scopeId))
    .limit(1);

  if (!scope) return NextResponse.json({ error: 'Scope not found' }, { status: 404 });
  if (scope.clientId !== session.userId) {
    return NextResponse.json({ error: 'Only the scope client can accept bids' }, { status: 403 });
  }
  if (scope.status !== 'open') {
    return NextResponse.json({ error: 'Scope is no longer open' }, { status: 400 });
  }

  try {
    // Determine the finalized work plan
    const finalizedWorkPlan: WorkPlan =
      (bid.workPlanModifications as WorkPlan) || (scope.workPlan as WorkPlan) || { workstreams: [] };

    // Create the contract
    const [contract] = await db
      .insert(contracts)
      .values({
        scopeId: scope.id,
        bidId: bid.id,
        clientId: session.userId,
        squadId: bid.squadId,
        title: scope.title,
        finalizedWorkPlan,
        roleAssignments: bid.roleAssignments || {},
        paymentSchedule: bid.paymentSchedule || {},
        totalAmount: bid.proposedPrice || '0',
        feedbackRoundsTotal: scope.feedbackRounds || 3,
      })
      .returning();

    if (!contract) {
      return NextResponse.json({ error: 'Failed to create contract' }, { status: 500 });
    }

    // Create workstreams and deliverables from the finalized work plan
    const planWorkstreams = finalizedWorkPlan.workstreams || [];

    for (let i = 0; i < planWorkstreams.length; i++) {
      const ws = planWorkstreams[i];
      if (!ws) continue;

      const [workstream] = await db
        .insert(workstreams)
        .values({
          contractId: contract.id,
          title: ws.title,
          description: ws.description,
          orderIndex: ws.orderIndex ?? i,
          dependencies: ws.dependencies || [],
          startDate: ws.startDate ? new Date(ws.startDate) : undefined,
          endDate: ws.endDate ? new Date(ws.endDate) : undefined,
        })
        .returning();

      // Create deliverables for this workstream
      if (!workstream) continue;
      const wsDeliverables = ws.deliverables || [];
      for (const del of wsDeliverables) {
        await db.insert(deliverables).values({
          contractId: contract.id,
          workstreamId: workstream.id,
          title: del.title,
          description: del.description,
          format: del.format,
          acceptanceCriteria: del.acceptanceCriteria,
          assignedMemberId: del.assignedMemberId,
          assignedAgentId: del.assignedAgentId,
          estimatedEffortHours: del.estimatedEffortHours,
          dueDate: del.dueDate ? new Date(del.dueDate) : undefined,
        });
      }
    }

    // Accept this bid
    await db
      .update(bids)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(eq(bids.id, bidId));

    // Reject all other bids for this scope
    await db
      .update(bids)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(
        and(
          eq(bids.scopeId, scope.id),
          ne(bids.id, bidId)
        )
      );

    // Set scope to contracted
    await db
      .update(scopes)
      .set({ status: 'contracted', updatedAt: new Date() })
      .where(eq(scopes.id, scope.id));

    return NextResponse.json(contract, { status: 201 });
  } catch (error) {
    console.error('Accept bid error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
