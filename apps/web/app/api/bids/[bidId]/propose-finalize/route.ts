export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne, count } from 'drizzle-orm';
import { db, bids, bidClaims, bidAssignments, scopes, squads, squadMembers, users, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

interface GovernanceModel {
  type: 'consent' | 'majority' | 'delegated';
  threshold?: number;
}

interface WorkPlanDeliverable {
  title: string;
  format?: string;
  estimatedHours?: number;
}

interface WorkPlanWorkstream {
  title: string;
  deliverables?: WorkPlanDeliverable[];
}

interface WorkPlan {
  workstreams?: WorkPlanWorkstream[];
}

/**
 * POST /api/bids/[bidId]/propose-finalize
 * Validates all claims are settled, converts claims to assignments, and moves bid to proposed status.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Auth: must be squad member
    const [membership] = await db
      .select()
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, bid.squadId),
          eq(squadMembers.userId, session.userId)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: 'Only squad members can propose finalization' },
        { status: 403 }
      );
    }

    // Bid must be in forming or changes_requested status
    if (bid.status !== 'forming' && bid.status !== 'draft' && bid.governanceStatus !== 'changes_requested') {
      return NextResponse.json(
        { error: `Bid must be in forming or changes_requested status, currently: ${bid.status}` },
        { status: 400 }
      );
    }

    // Validate: bid has approach and proposedPrice
    if (!bid.approach) {
      return NextResponse.json({ error: 'Bid must have an approach defined before finalizing' }, { status: 400 });
    }
    if (!bid.proposedPrice) {
      return NextResponse.json({ error: 'Bid must have a proposed price before finalizing' }, { status: 400 });
    }

    // Get scope work plan to know total deliverables
    const [scope] = await db
      .select({ workPlan: scopes.workPlan })
      .from(scopes)
      .where(eq(scopes.id, bid.scopeId))
      .limit(1);

    const workPlan = scope?.workPlan as WorkPlan | null;
    const totalDeliverables: string[] = [];
    if (workPlan?.workstreams) {
      let idx = 0;
      for (const ws of workPlan.workstreams) {
        for (const _del of ws.deliverables || []) {
          totalDeliverables.push(String(idx));
          idx++;
        }
      }
    }

    // Fetch all active claims
    const activeClaims = await db
      .select()
      .from(bidClaims)
      .where(
        and(
          eq(bidClaims.bidId, bidId),
          ne(bidClaims.status, 'withdrawn')
        )
      );

    // Validate: no contested claims remaining
    const contestedClaims = activeClaims.filter(c => c.status === 'contested');
    if (contestedClaims.length > 0) {
      const contestedKeys = [...new Set(contestedClaims.map(c => c.deliverableKey))];
      return NextResponse.json(
        { error: `Contested claims must be resolved before finalizing. Contested deliverables: ${contestedKeys.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate: all deliverables have at least one non-withdrawn claim
    if (totalDeliverables.length > 0) {
      const claimedKeys = new Set(activeClaims.map(c => c.deliverableKey));
      const unclaimedKeys = totalDeliverables.filter(k => !claimedKeys.has(k));
      if (unclaimedKeys.length > 0) {
        return NextResponse.json(
          { error: `All deliverables must be claimed. Unclaimed: ${unclaimedKeys.join(', ')}` },
          { status: 400 }
        );
      }
    }

    // Calculate total claimed BPS
    const totalClaimedBps = activeClaims.reduce((sum, c) => sum + c.proposedBps, 0);
    const treasuryBps = bid.treasuryShareBps ?? 2000;

    // Validate: total = 10000
    if (totalClaimedBps + treasuryBps !== 10000) {
      return NextResponse.json(
        {
          error: `Total claimed BPS (${totalClaimedBps}) + treasury (${treasuryBps}) must equal 10000. Current total: ${totalClaimedBps + treasuryBps}`,
        },
        { status: 400 }
      );
    }

    // Convert claims to bid assignments
    // First delete any existing assignments
    await db
      .delete(bidAssignments)
      .where(eq(bidAssignments.bidId, bidId));

    // Insert new assignments from claims
    const assignmentValues = activeClaims.map(claim => ({
      bidId,
      deliverableKey: claim.deliverableKey,
      userId: claim.userId,
      agentId: claim.agentId,
      roleTitle: null as string | null,
      paymentShareBps: claim.proposedBps,
      note: claim.note,
    }));

    if (assignmentValues.length > 0) {
      await db.insert(bidAssignments).values(assignmentValues);
    }

    // Fetch squad governance model for deadline
    const [squad] = await db
      .select()
      .from(squads)
      .where(eq(squads.id, bid.squadId))
      .limit(1);

    if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 });

    const governance = squad.governanceModel as GovernanceModel;

    // Set governance deadline
    let governanceDeadline: Date | null = null;
    const now = new Date();

    switch (governance.type) {
      case 'consent':
        governanceDeadline = new Date(now.getTime() + 72 * 60 * 60 * 1000);
        break;
      case 'majority':
        governanceDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        break;
      case 'delegated':
        governanceDeadline = null;
        break;
      default:
        governanceDeadline = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    }

    // Check for solo squad or delegated admin — auto-ratify
    const allMembers = await db
      .select({ userId: squadMembers.userId, role: squadMembers.role })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, bid.squadId));

    const isSoloSquad = allMembers.length <= 1;
    const isAdminDelegated = governance.type === 'delegated' && membership.role === 'admin';

    if (isSoloSquad || isAdminDelegated) {
      // Auto-ratify
      const [updated] = await db
        .update(bids)
        .set({
          status: 'ratified',
          governanceStatus: 'ratified',
          ratifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bidId))
        .returning();

      console.log(`[Activity] bid_proposed_and_auto_ratified: bid=${bidId}`);
      return NextResponse.json({ ...updated, autoRatified: true });
    }

    // Update bid status to under_review (proposed for governance)
    const [updated] = await db
      .update(bids)
      .set({
        status: 'under_review',
        governanceStatus: 'pending',
        governanceDeadline,
        updatedAt: new Date(),
      })
      .where(eq(bids.id, bidId))
      .returning();

    // Notify all squad members
    const otherMembers = allMembers.filter(m => m.userId !== session.userId);

    if (otherMembers.length > 0) {
      const [proposer] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      const proposerName = proposer?.displayName || 'A squad member';

      await db.insert(notifications).values(
        otherMembers.map(m => ({
          userId: m.userId,
          type: 'bid_proposed',
          title: 'Bid ready for governance vote',
          body: `${proposerName} finalized the bid and submitted it for governance review. Your vote is needed.`,
          metadata: {
            bidId,
            squadId: bid.squadId,
            scopeId: bid.scopeId,
          },
        }))
      );
    }

    console.log(`[Activity] bid_proposed_for_vote: bid=${bidId} by user=${session.userId}`);

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Propose finalize error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
