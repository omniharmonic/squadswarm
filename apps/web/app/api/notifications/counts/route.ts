export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { eq, and, sql } from 'drizzle-orm';
import { db, notifications, bids, bidVotes, squadMembers, agentActionQueue, contracts } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Count unread notifications
    const [unreadResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.userId, session.userId), eq(notifications.read, false)));

    // Count pending governance votes (bids in under_review for squads the user belongs to)
    const userSquads = await db
      .select({ squadId: squadMembers.squadId })
      .from(squadMembers)
      .where(eq(squadMembers.userId, session.userId));

    let pendingVotes = 0;
    for (const { squadId } of userSquads) {
      // Find bids under_review for this squad where user hasn't voted
      const underReviewBids = await db
        .select({ id: bids.id })
        .from(bids)
        .where(and(eq(bids.squadId, squadId), eq(bids.status, 'under_review')));

      for (const bid of underReviewBids) {
        const [existing] = await db
          .select()
          .from(bidVotes)
          .where(and(eq(bidVotes.bidId, bid.id), eq(bidVotes.userId, session.userId)))
          .limit(1);
        if (!existing) pendingVotes++;
      }
    }

    // Count pending agent actions in contracts where user is squad admin
    let agentActions = 0;
    for (const { squadId } of userSquads) {
      const [member] = await db
        .select()
        .from(squadMembers)
        .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, session.userId), eq(squadMembers.role, 'admin')))
        .limit(1);
      if (!member) continue;

      const squadContracts = await db
        .select({ id: contracts.id })
        .from(contracts)
        .where(eq(contracts.squadId, squadId));

      for (const contract of squadContracts) {
        const [queueCount] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(agentActionQueue)
          .where(and(eq(agentActionQueue.contractId, contract.id), eq(agentActionQueue.status, 'pending')));
        agentActions += queueCount?.count || 0;
      }
    }

    return NextResponse.json({
      unread: unreadResult?.count || 0,
      pendingVotes,
      agentActions,
    });
  } catch {
    return NextResponse.json({ unread: 0, pendingVotes: 0, agentActions: 0 });
  }
}
