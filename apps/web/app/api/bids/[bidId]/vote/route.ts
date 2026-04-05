export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { eq, and, count } from 'drizzle-orm';
import { db, bids, bidVotes, squads, squadMembers, users, notifications } from '@squadswarm/db';
import { getSession } from '@/lib/auth';

interface GovernanceModel {
  type: 'consent' | 'majority' | 'delegated';
  threshold?: number;
}

const VALID_VOTES = ['approve', 'reject', 'abstain'] as const;
type VoteValue = (typeof VALID_VOTES)[number];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bidId: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { bidId } = await params;

  try {
    const body = await req.json();
    const vote = body.vote as string;
    const comment = body.comment as string | undefined;

    // Validate vote value
    if (!vote || !VALID_VOTES.includes(vote as VoteValue)) {
      return NextResponse.json(
        { error: 'Vote must be one of: approve, reject, abstain' },
        { status: 400 }
      );
    }

    // Fetch the bid
    const [bid] = await db
      .select()
      .from(bids)
      .where(eq(bids.id, bidId))
      .limit(1);

    if (!bid) return NextResponse.json({ error: 'Bid not found' }, { status: 404 });

    // Bid must be in under_review status
    if (bid.status !== 'under_review') {
      return NextResponse.json(
        { error: `Bid must be under review to vote, currently: ${bid.status}` },
        { status: 400 }
      );
    }

    // Auth: must be a member of the bid's squad
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
        { error: 'Only squad members can vote on bids' },
        { status: 403 }
      );
    }

    // Upsert: check if user already voted
    const [existingVote] = await db
      .select()
      .from(bidVotes)
      .where(
        and(
          eq(bidVotes.bidId, bidId),
          eq(bidVotes.userId, session.userId)
        )
      )
      .limit(1);

    if (existingVote) {
      // Update existing vote
      await db
        .update(bidVotes)
        .set({
          vote,
          comment: comment ?? existingVote.comment,
          votedAt: new Date(),
        })
        .where(eq(bidVotes.id, existingVote.id));
    } else {
      // Insert new vote
      await db.insert(bidVotes).values({
        bidId,
        userId: session.userId,
        vote,
        comment,
      });
    }

    // Fetch all votes for this bid
    const allVotes = await db
      .select()
      .from(bidVotes)
      .where(eq(bidVotes.bidId, bidId));

    const approveCount = allVotes.filter((v) => v.vote === 'approve').length;
    const rejectCount = allVotes.filter((v) => v.vote === 'reject').length;
    const abstainCount = allVotes.filter((v) => v.vote === 'abstain').length;

    // Get total squad member count
    const [memberCountResult] = await db
      .select({ value: count() })
      .from(squadMembers)
      .where(eq(squadMembers.squadId, bid.squadId));

    const totalMembers = memberCountResult?.value ?? 0;

    // Fetch squad governance model
    const [squad] = await db
      .select()
      .from(squads)
      .where(eq(squads.id, bid.squadId))
      .limit(1);

    if (!squad) return NextResponse.json({ error: 'Squad not found' }, { status: 404 });

    const governance = squad.governanceModel as GovernanceModel;

    // Check if governance threshold is met
    let ratified = false;
    let rejected = false;
    const allMembersVoted = allVotes.length >= totalMembers;
    const deadlinePassed = bid.governanceDeadline ? new Date() >= bid.governanceDeadline : false;

    switch (governance.type) {
      case 'consent':
        // No reject votes AND (deadline passed OR all members voted)
        if (rejectCount > 0) {
          rejected = true;
        } else if (deadlinePassed || allMembersVoted) {
          ratified = true;
        }
        break;

      case 'majority':
        // Approve count > 50% of squad members
        if (approveCount > totalMembers / 2) {
          ratified = true;
        } else if (rejectCount > totalMembers / 2) {
          rejected = true;
        }
        break;

      case 'delegated':
        // Any admin approved
        if (vote === 'approve' && membership.role === 'admin') {
          ratified = true;
        } else if (vote === 'reject' && membership.role === 'admin') {
          rejected = true;
        }
        break;

      default:
        // Fallback to majority
        if (approveCount > totalMembers / 2) {
          ratified = true;
        }
    }

    // Update bid status if threshold reached
    if (ratified) {
      await db
        .update(bids)
        .set({
          status: 'ratified',
          governanceStatus: 'ratified',
          ratifiedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bidId));
    } else if (rejected) {
      await db
        .update(bids)
        .set({
          status: 'draft',
          governanceStatus: 'rejected',
          governanceDeadline: null,
          updatedAt: new Date(),
        })
        .where(eq(bids.id, bidId));
    }

    // Notify bid creator of the vote
    if (bid.createdById !== session.userId) {
      const [voter] = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);

      const voterName = voter?.displayName || 'A squad member';

      let notificationTitle = `Vote cast on your bid`;
      let notificationBody = `${voterName} voted "${vote}" on your bid.`;

      if (ratified) {
        notificationTitle = 'Bid ratified!';
        notificationBody = `Your bid has been ratified by the squad and is ready for submission.`;
      } else if (rejected) {
        notificationTitle = 'Bid sent back for revision';
        notificationBody = `Your bid was not approved. Please revise and resubmit for review.`;
      }

      await db.insert(notifications).values({
        userId: bid.createdById,
        type: ratified ? 'bid_ratified' : rejected ? 'bid_rejected' : 'bid_vote_cast',
        title: notificationTitle,
        body: notificationBody,
        metadata: {
          bidId,
          squadId: bid.squadId,
          vote,
          voterName,
        },
      });
    }

    console.log(`[Activity] bid_vote_cast: bid=${bidId} user=${session.userId} vote=${vote} ratified=${ratified} rejected=${rejected}`);

    return NextResponse.json({
      vote,
      ratified,
      rejected,
      votesSummary: {
        approve: approveCount,
        reject: rejectCount,
        abstain: abstainCount,
        total: allVotes.length,
        threshold: totalMembers,
        governanceType: governance.type,
      },
    });
  } catch (error) {
    console.error('Vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
