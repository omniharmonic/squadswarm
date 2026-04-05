'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface BidInfo {
  id: string;
  scopeId: string;
  squadId: string;
  createdById: string;
  approach: string;
  proposedPrice: string;
  treasuryShareBps: number;
  paymentSchedule: { upfrontPercentage?: number };
  proposedTimeline: { notes?: string };
  governanceStatus: string;
  governanceDeadline: string | null;
  ratifiedAt: string | null;
  status: string;
}
interface Assignment {
  deliverableKey: string;
  deliverableTitle?: string;
  userId: string | null;
  agentId: string | null;
  assigneeName?: string;
  paymentShareBps: number;
  roleTitle: string | null;
}
interface VoteInfo {
  userId: string;
  displayName: string;
  vote: string;
  comment: string | null;
  votedAt: string;
}
interface VoteSummary {
  approve: number;
  reject: number;
  abstain: number;
  total: number;
  threshold: number;
  ratified: boolean;
}

export default function BidVotePage() {
  const { bidId } = useParams<{ bidId: string }>();
  const router = useRouter();
  const [bid, setBid] = useState<BidInfo | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [votes, setVotes] = useState<VoteInfo[]>([]);
  const [summary, setSummary] = useState<VoteSummary | null>(null);
  const [myVote, setMyVote] = useState<string>('');
  const [comment, setComment] = useState('');
  const [changeRequest, setChangeRequest] = useState('');
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/bids/${bidId}`).then(r => r.json()),
      fetch(`/api/bids/${bidId}/assignments`).then(r => r.json()).catch(() => []),
      fetch(`/api/bids/${bidId}/votes`).then(r => r.json()).catch(() => ({ votes: [], summary: null })),
    ]).then(([bidData, assignData, voteData]) => {
      if (!bidData.error) setBid(bidData);
      if (Array.isArray(assignData)) setAssignments(assignData);
      else if (assignData.assignments) setAssignments(assignData.assignments);
      if (voteData.votes) setVotes(voteData.votes);
      if (voteData.summary) setSummary(voteData.summary);
    }).finally(() => setLoading(false));
  }, [bidId]);

  async function handleVote(vote: 'approve' | 'approve_with_note' | 'request_change' | 'block' | 'reject' | 'abstain') {
    if (vote === 'request_change' && !changeRequest.trim()) {
      toast.error('Please describe what change you want');
      return;
    }
    setVoting(true);
    try {
      const res = await fetch(`/api/bids/${bidId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vote,
          comment: comment || undefined,
          changeRequest: vote === 'request_change' ? changeRequest : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMyVote(vote);
        if (data.votesSummary) setSummary(data.votesSummary);
        toast.success(data.ratified ? 'Bid ratified!' : `Vote recorded: ${vote}`);
        if (data.ratified) {
          setTimeout(() => router.push(`/scopes/${bid?.scopeId}`), 1500);
        }
      } else {
        toast.error(data.error || 'Failed to vote');
      }
    } catch {
      toast.error('Failed to vote');
    } finally {
      setVoting(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (!bid) {
    return <div className="text-center py-20"><h2 className="text-lg font-semibold">Bid not found</h2></div>;
  }

  const isUnderReview = bid.status === 'under_review' || bid.status === 'proposed';
  const isRatified = bid.status === 'ratified';
  const deadlineDate = bid.governanceDeadline ? new Date(bid.governanceDeadline) : null;
  const timeLeft = deadlineDate ? Math.max(0, deadlineDate.getTime() - Date.now()) : 0;
  const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
  const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="max-w-3xl mx-auto">
      <Link href={`/scopes/${bid.scopeId}`} className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Scope
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold">Squad Bid Review</h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
            isRatified ? 'bg-success/10 text-success' :
            isUnderReview ? 'bg-warning/10 text-warning' :
            'bg-bg-secondary text-text-secondary'
          }`}>
            {isRatified ? 'Ratified' : isUnderReview ? 'Under Review' : bid.status}
          </span>
        </div>
        {deadlineDate && isUnderReview && (
          <p className="text-sm text-text-secondary">
            Voting deadline: {deadlineDate.toLocaleString()} ({hoursLeft}h {minutesLeft}m remaining)
          </p>
        )}
      </div>

      {/* Bid Details */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Bid Details</h2>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="p-3 bg-bg-primary rounded-lg">
            <div className="text-xs text-text-secondary">Price</div>
            <div className="text-lg font-bold">${bid.proposedPrice} USDC</div>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <div className="text-xs text-text-secondary">Upfront</div>
            <div className="text-lg font-bold">{bid.paymentSchedule?.upfrontPercentage || 0}%</div>
          </div>
          <div className="p-3 bg-bg-primary rounded-lg">
            <div className="text-xs text-text-secondary">Treasury</div>
            <div className="text-lg font-bold">{((bid.treasuryShareBps || 0) / 100).toFixed(0)}%</div>
          </div>
        </div>
        {bid.approach && (
          <div className="mb-4">
            <h3 className="text-sm font-medium mb-1">Approach</h3>
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{bid.approach}</p>
          </div>
        )}
      </div>

      {/* Team Assignments */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Team Assignments</h2>
        <div className="space-y-2">
          {assignments.map((a, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-bg-primary rounded-lg">
              <div>
                <div className="text-sm font-medium">{a.deliverableTitle || `Deliverable ${a.deliverableKey}`}</div>
                <div className="text-xs text-text-secondary">
                  {a.assigneeName || (a.agentId ? 'AI Agent' : 'Unassigned')}
                  {a.agentId && <span className="ml-1 text-accent-agent">(AI)</span>}
                </div>
              </div>
              <span className="text-sm font-mono">{(a.paymentShareBps / 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Vote Summary */}
      {summary && (
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Votes</h2>
          <div className="flex gap-4 mb-4">
            {[
              { label: 'Approve', count: summary.approve, color: 'text-success bg-success/10' },
              { label: 'Reject', count: summary.reject, color: 'text-error bg-error/10' },
              { label: 'Abstain', count: summary.abstain, color: 'text-text-muted bg-bg-secondary' },
            ].map(v => (
              <div key={v.label} className={`flex-1 p-3 rounded-lg text-center ${v.color}`}>
                <div className="text-2xl font-bold">{v.count}</div>
                <div className="text-xs">{v.label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-text-secondary text-center">
            {summary.total} of {summary.threshold} votes needed
          </div>

          {/* Individual votes */}
          {votes.length > 0 && (
            <div className="mt-4 space-y-2">
              {votes.map(v => (
                <div key={v.userId} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full ${
                    v.vote === 'approve' || v.vote === 'approve_with_note' ? 'bg-success' :
                    v.vote === 'reject' || v.vote === 'block' ? 'bg-error' :
                    v.vote === 'request_change' ? 'bg-warning' : 'bg-text-muted'
                  }`} />
                  <span className="font-medium">{v.displayName}</span>
                  <span className="text-text-secondary capitalize">{v.vote.replace(/_/g, ' ')}</span>
                  {v.comment && <span className="text-text-muted">— {v.comment}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cast Vote */}
      {isUnderReview && !myVote && (
        <div className="bg-white rounded-xl border border-accent-squad/20 p-6">
          <h2 className="text-lg font-semibold mb-4">Cast Your Vote</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Comment (optional)</label>
            <textarea
              value={comment} onChange={e => setComment(e.target.value)} rows={2}
              placeholder="Any feedback or conditions..."
              className="w-full px-3.5 py-2.5 border border-border rounded-xl bg-bg-primary focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y"
            />
          </div>

          {/* Primary actions */}
          <div className="flex gap-3 mb-3">
            <button onClick={() => handleVote('approve')} disabled={voting}
              className="flex-1 px-4 py-3 bg-success text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50">
              Approve
            </button>
            <button onClick={() => handleVote('approve_with_note')} disabled={voting || !comment.trim()}
              className="flex-1 px-4 py-3 bg-success/80 text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50"
              title="Approve but flag your comment as important">
              Approve with Note
            </button>
          </div>

          {/* Request change */}
          <div className="mb-3 p-3 bg-warning/5 border border-warning/20 rounded-xl">
            <label className="block text-xs font-medium text-warning mb-1.5">Request a specific change (sends bid back for revision)</label>
            <textarea
              value={changeRequest} onChange={e => setChangeRequest(e.target.value)} rows={2}
              placeholder="e.g. 'I think Carol should take the frontend deliverable instead of the API'"
              className="w-full px-3 py-2 border border-warning/30 rounded-lg bg-white text-sm focus:outline-none focus:ring-2 focus:ring-warning/40 resize-y mb-2"
            />
            <button onClick={() => handleVote('request_change')} disabled={voting || !changeRequest.trim()}
              className="px-4 py-2 bg-warning text-white rounded-lg text-xs font-medium hover:opacity-90 disabled:opacity-50">
              Request Change
            </button>
          </div>

          {/* Block / Abstain */}
          <div className="flex gap-3">
            <button onClick={() => handleVote('block')} disabled={voting || !comment.trim()}
              className="flex-1 px-4 py-2.5 bg-error text-white rounded-xl text-xs font-medium hover:opacity-90 disabled:opacity-50"
              title="Block this bid — requires a reason in the comment field">
              Block (with reason)
            </button>
            <button onClick={() => handleVote('abstain')} disabled={voting}
              className="flex-1 px-4 py-2.5 border border-border rounded-xl text-xs font-medium hover:bg-bg-secondary disabled:opacity-50">
              Abstain
            </button>
          </div>
        </div>
      )}

      {/* Changes Requested banner */}
      {bid.status === 'changes_requested' && (
        <div className="bg-warning/5 border border-warning/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-5 h-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            <div className="text-warning font-semibold">Changes Requested</div>
          </div>
          <p className="text-sm text-text-secondary mb-3">A squad member requested changes to this bid. Go back to the collaboration page to address the feedback.</p>
          <Link href={`/bids/${bidId}/collaborate`} className="inline-block px-4 py-2 bg-accent-squad text-white rounded-lg text-sm font-medium hover:bg-accent-squad-hover">
            Edit Bid
          </Link>
        </div>
      )}

      {/* Ratified — Submit button */}
      {isRatified && (
        <div className="bg-success/5 border border-success/20 rounded-xl p-6 text-center">
          <div className="text-success text-lg font-semibold mb-2">Bid Ratified by Squad</div>
          <p className="text-sm text-text-secondary mb-4">This bid has been approved by your squad. Submit it to the client.</p>
          <button
            onClick={async () => {
              const res = await fetch(`/api/bids/${bidId}/submit`, { method: 'POST' });
              if (res.ok) {
                toast.success('Bid submitted to client!');
                router.push(`/scopes/${bid.scopeId}`);
              } else {
                const d = await res.json();
                toast.error(d.error || 'Failed');
              }
            }}
            className="px-8 py-3 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover"
          >
            Submit Bid to Client
          </button>
        </div>
      )}
    </div>
  );
}
