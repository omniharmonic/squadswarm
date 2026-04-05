export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, ne } from 'drizzle-orm';
import { db, bids, bidClaims, scopes, squadMembers, users, agents, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

interface WorkPlanDeliverable {
  title: string;
  format?: string;
  estimatedHours?: number;
  requiredSkills?: string[];
}

interface WorkPlanWorkstream {
  title: string;
  deliverables?: WorkPlanDeliverable[];
}

interface WorkPlan {
  workstreams?: WorkPlanWorkstream[];
}

/**
 * GET /api/bids/[bidId]/claims
 * Returns all claims for a bid grouped by deliverable, with summary stats.
 */
export async function GET(
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
        { error: 'Only squad members can view claims' },
        { status: 403 }
      );
    }

    // Fetch all claims with user/agent names
    const claims = await db
      .select({
        id: bidClaims.id,
        bidId: bidClaims.bidId,
        deliverableKey: bidClaims.deliverableKey,
        userId: bidClaims.userId,
        agentId: bidClaims.agentId,
        proposedBps: bidClaims.proposedBps,
        status: bidClaims.status,
        note: bidClaims.note,
        createdAt: bidClaims.createdAt,
        updatedAt: bidClaims.updatedAt,
        userName: users.displayName,
        userEmail: users.email,
        agentName: agents.name,
      })
      .from(bidClaims)
      .leftJoin(users, eq(bidClaims.userId, users.id))
      .leftJoin(agents, eq(bidClaims.agentId, agents.id))
      .where(eq(bidClaims.bidId, bidId));

    // Get scope work plan for deliverable info
    const [scope] = await db
      .select({ workPlan: scopes.workPlan })
      .from(scopes)
      .where(eq(scopes.id, bid.scopeId))
      .limit(1);

    const workPlan = scope?.workPlan as WorkPlan | null;
    const flatDeliverables: { title: string; format: string; estimatedHours: number; requiredSkills: string[] }[] = [];
    if (workPlan?.workstreams) {
      for (const ws of workPlan.workstreams) {
        for (const del of ws.deliverables || []) {
          flatDeliverables.push({
            title: del.title,
            format: del.format || 'unknown',
            estimatedHours: del.estimatedHours || 0,
            requiredSkills: del.requiredSkills || [],
          });
        }
      }
    }

    // Group claims by deliverableKey
    const deliverableMap = new Map<string, {
      key: string;
      title: string;
      format: string;
      estimatedHours: number;
      requiredSkills: string[];
      claims: typeof enrichedClaims;
      status: string;
    }>();

    const enrichedClaims = claims.map(c => ({
      id: c.id,
      userId: c.userId,
      agentId: c.agentId,
      userName: c.agentName || c.userName || c.userEmail?.split('@')[0] || 'Unknown',
      proposedBps: c.proposedBps,
      note: c.note,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      deliverableKey: c.deliverableKey,
    }));

    // Initialize all deliverables from the work plan
    for (let i = 0; i < flatDeliverables.length; i++) {
      const key = String(i);
      const del = flatDeliverables[i]!;
      deliverableMap.set(key, {
        key,
        title: del.title,
        format: del.format,
        estimatedHours: del.estimatedHours,
        requiredSkills: del.requiredSkills,
        claims: [],
        status: 'unclaimed',
      });
    }

    // Add claims to their deliverables
    for (const claim of enrichedClaims) {
      const existing = deliverableMap.get(claim.deliverableKey);
      if (existing) {
        existing.claims.push(claim);
      } else {
        // Deliverable key not in work plan — still include it
        deliverableMap.set(claim.deliverableKey, {
          key: claim.deliverableKey,
          title: `Deliverable ${claim.deliverableKey}`,
          format: 'unknown',
          estimatedHours: 0,
          requiredSkills: [],
          claims: [claim],
          status: 'unclaimed',
        });
      }
    }

    // Determine status per deliverable
    for (const [, del] of deliverableMap) {
      const activeClaims = del.claims.filter(c => c.status !== 'withdrawn');
      if (activeClaims.length === 0) {
        del.status = 'unclaimed';
      } else if (activeClaims.some(c => c.status === 'resolved')) {
        del.status = 'resolved';
      } else if (activeClaims.length > 1) {
        del.status = 'contested';
      } else {
        del.status = 'claimed';
      }
    }

    // Build summary
    const allActiveClaims = enrichedClaims.filter(c => c.status !== 'withdrawn');
    // For summary, count only resolved or single-claimed (not contested duplicates)
    let totalClaimedBps = 0;
    for (const [, del] of deliverableMap) {
      const activeClaims = del.claims.filter(c => c.status !== 'withdrawn');
      if (del.status === 'resolved') {
        const resolved = activeClaims.find(c => c.status === 'resolved');
        if (resolved) totalClaimedBps += resolved.proposedBps;
      } else if (del.status === 'claimed' && activeClaims.length === 1) {
        totalClaimedBps += activeClaims[0]!.proposedBps;
      }
      // contested: don't count toward total since it's ambiguous
    }

    const treasuryBps = bid.treasuryShareBps ?? 2000;
    const remaining = 10000 - totalClaimedBps - treasuryBps;

    const deliverables = Array.from(deliverableMap.values()).sort(
      (a, b) => parseInt(a.key, 10) - parseInt(b.key, 10)
    );

    return NextResponse.json({
      deliverables,
      summary: {
        totalClaimedBps,
        treasuryBps,
        remaining: Math.max(0, remaining),
        allClaimed: remaining <= 0 && !deliverables.some(d => d.status === 'unclaimed' || d.status === 'contested'),
      },
    });
  } catch (error) {
    console.error('Get claims error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/bids/[bidId]/claims
 * Claim a deliverable for yourself or your agent.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    const body = await req.json();
    const { deliverableKey, proposedBps, note, agentId } = body;

    // Validate required fields
    if (deliverableKey === undefined || deliverableKey === null) {
      return NextResponse.json({ error: 'deliverableKey is required' }, { status: 400 });
    }
    if (typeof proposedBps !== 'number' || proposedBps < 0 || proposedBps > 10000) {
      return NextResponse.json({ error: 'proposedBps must be a number between 0 and 10000' }, { status: 400 });
    }

    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Bid must be in forming or changes_requested status
    if (bid.status !== 'forming' && bid.status !== 'draft' && bid.governanceStatus !== 'changes_requested') {
      return NextResponse.json(
        { error: `Bid must be in forming status to claim deliverables, currently: ${bid.status}` },
        { status: 400 }
      );
    }

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
        { error: 'Only squad members can claim deliverables' },
        { status: 403 }
      );
    }

    // If agentId provided, verify the user owns that agent
    if (agentId) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(
          and(
            eq(agents.id, agentId),
            eq(agents.ownerId, session.userId)
          )
        )
        .limit(1);

      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found or you are not the agent owner' },
          { status: 403 }
        );
      }
    }

    const claimantUserId = agentId ? null : session.userId;
    const claimantAgentId = agentId || null;

    // Check if this user/agent already has a non-withdrawn claim on this deliverable
    const existingClaims = await db
      .select()
      .from(bidClaims)
      .where(
        and(
          eq(bidClaims.bidId, bidId),
          eq(bidClaims.deliverableKey, String(deliverableKey)),
          ne(bidClaims.status, 'withdrawn')
        )
      );

    // Find existing claim by same claimant
    const myExistingClaim = existingClaims.find(c =>
      agentId
        ? c.agentId === agentId
        : c.userId === session.userId
    );

    let claim: typeof existingClaims[number];

    if (myExistingClaim) {
      // Update existing claim instead of creating duplicate
      const [updated] = await db
        .update(bidClaims)
        .set({
          proposedBps,
          note: note ?? myExistingClaim.note,
          updatedAt: new Date(),
        })
        .where(eq(bidClaims.id, myExistingClaim.id))
        .returning();

      if (!updated) return NextResponse.json({ error: 'Failed to update claim' }, { status: 500 });
      claim = updated;
    } else {
      // Insert new claim
      const [created] = await db
        .insert(bidClaims)
        .values({
          bidId,
          deliverableKey: String(deliverableKey),
          userId: claimantUserId,
          agentId: claimantAgentId,
          proposedBps,
          status: 'claimed',
          note: note || null,
        })
        .returning();

      if (!created) return NextResponse.json({ error: 'Failed to create claim' }, { status: 500 });
      claim = created;
    }

    // Check if there are other non-withdrawn claims on this deliverable (from other people)
    const otherActiveClaims = existingClaims.filter(c =>
      agentId
        ? c.agentId !== agentId
        : c.userId !== session.userId
    );

    if (otherActiveClaims.length > 0) {
      // Mark all active claims on this deliverable as contested
      await db
        .update(bidClaims)
        .set({ status: 'contested', updatedAt: new Date() })
        .where(
          and(
            eq(bidClaims.bidId, bidId),
            eq(bidClaims.deliverableKey, String(deliverableKey)),
            ne(bidClaims.status, 'withdrawn')
          )
        );

      // Update our returned claim status
      claim.status = 'contested';
    }

    // Notify other squad members
    const otherMembers = await db
      .select({ userId: squadMembers.userId })
      .from(squadMembers)
      .where(
        and(
          eq(squadMembers.squadId, bid.squadId),
          ne(squadMembers.userId, session.userId)
        )
      );

    if (otherMembers.length > 0) {
      const [claimant] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      const claimantName = claimant?.displayName || 'A squad member';

      await db.insert(notifications).values(
        otherMembers.map(m => ({
          userId: m.userId,
          type: 'deliverable_claimed',
          title: otherActiveClaims.length > 0
            ? 'Deliverable claim contested!'
            : 'Deliverable claimed',
          body: otherActiveClaims.length > 0
            ? `${claimantName} also claimed deliverable #${deliverableKey}. Review and resolve the contested claim.`
            : `${claimantName} claimed deliverable #${deliverableKey} on a bid.`,
          metadata: {
            bidId,
            squadId: bid.squadId,
            deliverableKey: String(deliverableKey),
            claimId: claim.id,
          },
        }))
      );
    }

    console.log(`[Activity] deliverable_claimed: bid=${bidId} key=${deliverableKey} user=${session.userId} agent=${agentId || 'none'}`);

    return NextResponse.json(claim);
  } catch (error) {
    console.error('Create claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/bids/[bidId]/claims
 * Withdraw a claim. Pass claimId as query param or in body.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    // Get claimId from query param or body
    const url = new URL(req.url);
    let claimId = url.searchParams.get('claimId');

    if (!claimId) {
      try {
        const body = await req.json();
        claimId = body.claimId;
      } catch {
        // No body provided
      }
    }

    if (!claimId) {
      return NextResponse.json({ error: 'claimId is required' }, { status: 400 });
    }

    // Fetch the claim
    const [claim] = await db
      .select()
      .from(bidClaims)
      .where(
        and(
          eq(bidClaims.id, claimId),
          eq(bidClaims.bidId, bidId)
        )
      )
      .limit(1);

    if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 });

    // Auth: must be the claim owner (userId or agent owner)
    let isOwner = claim.userId === session.userId;

    if (!isOwner && claim.agentId) {
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, claim.agentId))
        .limit(1);

      isOwner = agent?.ownerId === session.userId;
    }

    if (!isOwner) {
      return NextResponse.json(
        { error: 'Only the claim owner can withdraw a claim' },
        { status: 403 }
      );
    }

    if (claim.status === 'withdrawn') {
      return NextResponse.json({ error: 'Claim is already withdrawn' }, { status: 400 });
    }

    // Withdraw the claim
    await db
      .update(bidClaims)
      .set({ status: 'withdrawn', updatedAt: new Date() })
      .where(eq(bidClaims.id, claimId));

    // If the deliverable was contested, check if the remaining claim should revert to 'claimed'
    if (claim.status === 'contested') {
      const remainingClaims = await db
        .select()
        .from(bidClaims)
        .where(
          and(
            eq(bidClaims.bidId, bidId),
            eq(bidClaims.deliverableKey, claim.deliverableKey),
            ne(bidClaims.status, 'withdrawn')
          )
        );

      if (remainingClaims.length === 1) {
        // Only one claim left — revert from contested to claimed
        await db
          .update(bidClaims)
          .set({ status: 'claimed', updatedAt: new Date() })
          .where(eq(bidClaims.id, remainingClaims[0]!.id));
      }
    }

    console.log(`[Activity] claim_withdrawn: bid=${bidId} claim=${claimId} user=${session.userId}`);

    return NextResponse.json({ success: true, claimId });
  } catch (error) {
    console.error('Delete claim error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
