'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface BidData {
  id: string;
  scopeId: string;
  squadId: string;
  approach: string | null;
  roleAssignments: Record<string, string>[] | null;
  proposedTimeline: { startDate?: string; endDate?: string; notes?: string } | null;
  proposedPrice: string | null;
  paymentSchedule: { upfrontPercent?: number; finalPercent?: number; milestones?: string[] } | null;
  trackRecord: { projects?: number; rating?: number } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const MOCK_BID: BidData = {
  id: 'mock-bid-1',
  scopeId: 'mock-scope-1',
  squadId: 'mock-squad-1',
  approach:
    'We will take a modular, iterative approach — starting with the data pipeline and subgraph integration in week one, followed by the frontend dashboard build in weeks two and three. Our AI agents handle data normalization and documentation while human members focus on architecture and UX design. We emphasize continuous delivery with weekly demos.',
  roleAssignments: [
    { role: 'Lead Developer', assignee: 'Benjamin Life' },
    { role: 'Data Engineer', assignee: 'CodeSwarm (Agent)' },
    { role: 'UX Designer', assignee: 'Amara Osei' },
    { role: 'Research', assignee: 'ResearchBot (Agent)' },
  ],
  proposedTimeline: {
    startDate: '2026-04-07',
    endDate: '2026-05-02',
    notes: '4 weeks with weekly check-ins. Buffer week built into final milestone.',
  },
  proposedPrice: '12500.00',
  paymentSchedule: { upfrontPercent: 30, finalPercent: 70 },
  trackRecord: { projects: 7, rating: 4.8 },
  status: 'draft',
  createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  updatedAt: new Date(Date.now() - 3600000).toISOString(),
};

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-bg-secondary text-text-secondary',
  submitted: 'bg-accent-client/10 text-accent-client',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-error/10 text-error',
};

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function BidDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bidId = params.bidId as string;

  const [bid, setBid] = useState<BidData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchBid() {
      try {
        const res = await fetch(`/api/bids/${bidId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setBid(data);
      } catch {
        setBid(MOCK_BID);
      } finally {
        setLoading(false);
      }
    }
    fetchBid();
  }, [bidId]);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/bids/${bidId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setBid(updated);
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-bg-secondary rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <div className="h-4 w-full bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-3/4 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!bid) return null;

  const isDraft = bid.status === 'draft';
  const roleAssignments = Array.isArray(bid.roleAssignments) ? bid.roleAssignments : [];
  const timeline = bid.proposedTimeline as BidData['proposedTimeline'];
  const payment = bid.paymentSchedule as BidData['paymentSchedule'];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-text-primary">Bid Detail</h1>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[bid.status] || STATUS_STYLES.draft}`}
          >
            {bid.status}
          </span>
        </div>
        <p className="text-text-secondary text-sm">
          Created {formatDate(bid.createdAt)} &middot; Last updated {formatDate(bid.updatedAt)}
        </p>
      </div>

      {/* Approach */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Approach</h2>
        <p className="text-text-primary leading-relaxed">{bid.approach || 'No approach described yet.'}</p>
      </section>

      {/* Pricing & Payment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <section className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Proposed Price</h2>
          <p className="text-3xl font-bold text-text-primary">
            {bid.proposedPrice ? formatCurrency(bid.proposedPrice) : '--'}
          </p>
        </section>

        <section className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Payment Schedule</h2>
          {payment ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">Upfront</span>
                <span className="font-semibold text-text-primary">{payment.upfrontPercent ?? 0}%</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2">
                <div
                  className="bg-accent-squad h-2 rounded-full"
                  style={{ width: `${payment.upfrontPercent ?? 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary text-sm">On completion</span>
                <span className="font-semibold text-text-primary">{payment.finalPercent ?? 0}%</span>
              </div>
            </div>
          ) : (
            <p className="text-text-secondary">Not specified</p>
          )}
        </section>
      </div>

      {/* Timeline */}
      {timeline && (
        <section className="bg-white rounded-xl border border-border p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Timeline</h2>
          <div className="flex gap-8 mb-3">
            {timeline.startDate && (
              <div>
                <p className="text-xs text-text-secondary">Start</p>
                <p className="font-medium text-text-primary">{formatDate(timeline.startDate)}</p>
              </div>
            )}
            {timeline.endDate && (
              <div>
                <p className="text-xs text-text-secondary">End</p>
                <p className="font-medium text-text-primary">{formatDate(timeline.endDate)}</p>
              </div>
            )}
          </div>
          {timeline.notes && <p className="text-sm text-text-secondary">{timeline.notes}</p>}
        </section>
      )}

      {/* Role Assignments */}
      {roleAssignments.length > 0 && (
        <section className="bg-white rounded-xl border border-border p-6 mb-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Role Assignments
          </h2>
          <div className="space-y-2">
            {roleAssignments.map((ra, i) => {
              const isAgent = (ra.assignee || '').includes('Agent');
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm font-medium text-text-primary">{ra.role}</span>
                  <span className={`text-sm ${isAgent ? 'text-accent-agent' : 'text-text-secondary'}`}>
                    {isAgent && (
                      <span className="inline-block w-2 h-2 bg-accent-agent rounded-sm rotate-45 mr-1.5 align-middle" />
                    )}
                    {ra.assignee}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Squad Link */}
      <section className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Squad</h2>
        <Link
          href={`/squads/${bid.squadId}`}
          className="text-accent-squad hover:underline font-medium"
        >
          View Squad &rarr;
        </Link>
      </section>

      {/* Actions */}
      {isDraft && (
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/bids/${bidId}/edit`)}
            className="px-5 py-2.5 border border-border text-text-primary rounded-xl text-sm font-medium hover:bg-bg-secondary transition-colors"
          >
            Edit Bid
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad/90 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Bid'}
          </button>
        </div>
      )}
    </div>
  );
}
