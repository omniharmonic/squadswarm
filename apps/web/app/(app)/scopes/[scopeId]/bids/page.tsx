'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface Bid {
  id: string;
  scopeId: string;
  squadId: string;
  squadName: string;
  squadSlug: string;
  approach: string | null;
  proposedPrice: string | null;
  paymentSchedule: { upfrontPercentage?: number; finalPercentage?: number } | null;
  proposedTimeline: { notes?: string } | null;
  status: string;
  createdAt: string;
}

function formatPrice(price: string | null) {
  if (!price) return 'Not specified';
  return Number(price).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

const statusStyles: Record<string, string> = {
  draft: 'bg-bg-secondary text-text-secondary',
  submitted: 'bg-accent-agent/10 text-accent-agent',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};

export default function BidsReviewPage() {
  const params = useParams();
  const router = useRouter();
  const scopeId = params.scopeId as string;

  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedBid, setExpandedBid] = useState<string | null>(null);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [rejectingBidId, setRejectingBidId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/scopes/${scopeId}/bids`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load bids');
        return res.json();
      })
      .then((data) => setBids(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scopeId]);

  async function handleAccept(bidId: string) {
    setAcceptingBidId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}/accept`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to accept bid');
      }
      const contract = await res.json();
      toast.success('Bid accepted! Contract created.');
      router.push(`/contracts/${contract.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to accept bid');
    } finally {
      setAcceptingBidId(null);
    }
  }

  async function handleReject(bidId: string) {
    setRejectingBidId(bidId);
    try {
      const res = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reject bid');
      }
      setBids((prev) => prev.map((b) => (b.id === bidId ? { ...b, status: 'rejected' } : b)));
      toast.success('Bid rejected.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to reject bid');
    } finally {
      setRejectingBidId(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h1 className="text-xl font-semibold mb-2">Error Loading Bids</h1>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <Link href={`/scopes/${scopeId}`} className="text-sm text-accent-squad hover:underline font-medium">
            Back to Scope
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={`/scopes/${scopeId}`}
        className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Scope
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Review Bids</h1>
        <p className="text-text-secondary mt-1">
          {bids.length} bid{bids.length !== 1 ? 's' : ''} received for this scope.
        </p>
      </div>

      {bids.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold mb-2">No bids received yet</h2>
          <p className="text-text-secondary text-sm">Check back later. Squads are reviewing your scope.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid) => {
            const isExpanded = expandedBid === bid.id;
            const schedule = bid.paymentSchedule;
            const timeline = bid.proposedTimeline;

            return (
              <div key={bid.id} className="bg-white rounded-xl border border-border overflow-hidden">
                {/* Bid header */}
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <Link
                        href={`/squads/${bid.squadSlug || bid.squadId}`}
                        className="text-lg font-semibold hover:text-accent-squad transition-colors"
                      >
                        {bid.squadName}
                      </Link>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Submitted {new Date(bid.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${statusStyles[bid.status] ?? statusStyles.draft}`}
                    >
                      {bid.status}
                    </span>
                  </div>

                  {/* Price */}
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-bold text-accent-squad">{formatPrice(bid.proposedPrice)}</span>
                    {schedule && (
                      <span className="text-xs text-text-secondary">
                        ({schedule.upfrontPercentage ?? 0}% upfront / {schedule.finalPercentage ?? 100}% on completion)
                      </span>
                    )}
                  </div>

                  {/* Approach preview / expanded */}
                  {bid.approach && (
                    <div className="mb-3">
                      <h3 className="text-sm font-medium mb-1">Approach</h3>
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                        {isExpanded ? bid.approach : bid.approach.slice(0, 200)}
                        {!isExpanded && bid.approach.length > 200 && '...'}
                      </p>
                      {bid.approach.length > 200 && (
                        <button
                          onClick={() => setExpandedBid(isExpanded ? null : bid.id)}
                          className="text-xs text-accent-squad hover:underline mt-1 font-medium"
                        >
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Timeline notes */}
                  {timeline?.notes && (
                    <div className="mb-3">
                      <h3 className="text-sm font-medium mb-1">Timeline</h3>
                      <p className="text-sm text-text-secondary">{timeline.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  {bid.status !== 'accepted' && bid.status !== 'rejected' && (
                    <div className="flex items-center gap-3 pt-3 border-t border-border mt-4">
                      <button
                        onClick={() => handleAccept(bid.id)}
                        disabled={acceptingBidId === bid.id}
                        className="px-5 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                      >
                        {acceptingBidId === bid.id ? 'Accepting...' : 'Accept Bid'}
                      </button>
                      <button
                        onClick={() => handleReject(bid.id)}
                        disabled={rejectingBidId === bid.id}
                        className="px-5 py-2 border border-error/30 text-error rounded-lg text-sm font-medium hover:bg-error/5 transition-colors disabled:opacity-50"
                      >
                        {rejectingBidId === bid.id ? 'Rejecting...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
