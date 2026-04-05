'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Scope {
  id: string;
  title: string;
  narrative: string | null;
  categoryTags: string[] | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineDays: number | null;
  feedbackRounds: number | null;
  trustThreshold: string | null;
  confidentiality: string | null;
  biddingDeadline: string | null;
  status: string;
  workPlan: Record<string, unknown> | null;
  bidCount?: number;
  clientId?: string;
}

interface SessionUser {
  user: {
    id: string;
    email: string;
  };
}

function formatBudget(min: string | null, max: string | null) {
  if (!min && !max) return 'Open budget';
  const fmt = (v: string) =>
    Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  return `Up to ${fmt(max!)}`;
}

function daysLeft(deadline: string | null) {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.max(0, Math.ceil(diff / 86400000));
  if (days === 0) return 'Closing today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

const trustColors: Record<string, string> = {
  open: 'bg-bg-secondary text-text-secondary',
  verified: 'bg-accent-agent/10 text-accent-agent',
  trusted: 'bg-accent-client/10 text-accent-client',
  elite: 'bg-accent-squad/10 text-accent-squad',
};

export default function ScopeDetailPage() {
  const params = useParams();
  const scopeId = params.scopeId as string;
  const [scope, setScope] = useState<Scope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/scopes/${scopeId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then((data) => setScope(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data: SessionUser) => {
        if (data.user?.id) setCurrentUserId(data.user.id);
      })
      .catch(() => {});
  }, [scopeId]);

  const isClient = !!(currentUserId && scope?.clientId && currentUserId === scope.clientId);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !scope) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h1 className="text-xl font-semibold mb-2">Scope Not Found</h1>
          <p className="text-text-secondary text-sm mb-4">This scope may have been removed or the link is incorrect.</p>
          <Link href="/scopes" className="text-sm text-accent-squad hover:underline font-medium">Back to Scope Board</Link>
        </div>
      </div>
    );
  }

  // Extract work plan workstreams if available
  const workPlan = scope.workPlan as Record<string, unknown> | null;
  const workstreams = (workPlan?.workstreams as Array<Record<string, unknown>>) || [];
  const wpSummary = workPlan?.summary as string | undefined;

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/scopes" className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary mb-4">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to Scope Board
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 sm:p-8 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">{scope.title}</h1>
          {scope.biddingDeadline && (
            <span className="text-xs text-text-secondary whitespace-nowrap pt-1">{daysLeft(scope.biddingDeadline)}</span>
          )}
        </div>

        {scope.categoryTags && scope.categoryTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {scope.categoryTags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-bg-secondary text-text-secondary text-xs rounded-full">{tag}</span>
            ))}
          </div>
        )}

        {scope.narrative && (
          <div className="mb-6">
            <h2 className="text-sm font-medium mb-2">Scope Narrative</h2>
            <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{scope.narrative}</p>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-bg-primary rounded-lg border border-border">
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Budget</p>
            <p className="text-sm font-medium">{formatBudget(scope.budgetMin, scope.budgetMax)}</p>
          </div>
          {scope.timelineDays && (
            <div>
              <p className="text-xs text-text-secondary mb-0.5">Timeline</p>
              <p className="text-sm font-medium">{scope.timelineDays} days</p>
            </div>
          )}
          {scope.feedbackRounds && (
            <div>
              <p className="text-xs text-text-secondary mb-0.5">Feedback Rounds</p>
              <p className="text-sm font-medium">{scope.feedbackRounds}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Trust Threshold</p>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${trustColors[scope.trustThreshold || 'open'] ?? trustColors.open}`}>
              {scope.trustThreshold || 'Open'}
            </span>
          </div>
          <div>
            <p className="text-xs text-text-secondary mb-0.5">Status</p>
            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium capitalize bg-success/10 text-success">{scope.status}</span>
          </div>
          {scope.bidCount !== undefined && (
            <div>
              <p className="text-xs text-text-secondary mb-0.5">Bids</p>
              <p className="text-sm font-medium">{scope.bidCount}</p>
            </div>
          )}
        </div>
      </div>

      {/* Work Plan */}
      {workPlan && workstreams.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 mb-5">
          <h2 className="text-lg font-semibold mb-3">Work Plan</h2>
          {wpSummary && <p className="text-sm text-text-secondary leading-relaxed mb-4">{wpSummary}</p>}
          <div className="space-y-3">
            {workstreams.map((ws, i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-accent-agent/5 px-4 py-2.5 border-b border-border flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent-agent/10 text-accent-agent text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <h4 className="font-medium text-sm">{ws.title as string}</h4>
                </div>
                {(ws.deliverables as Array<Record<string, unknown>> | undefined)?.map((del, di) => (
                  <div key={di} className="px-4 py-2 border-b border-border last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm">{del.title as string}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent">{del.format as string}</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA */}
      {isClient && scope.status === 'open' ? (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">Review Bids</h2>
          <p className="text-sm text-text-secondary mb-4">
            {scope.bidCount
              ? `You have ${scope.bidCount} bid${scope.bidCount !== 1 ? 's' : ''} to review.`
              : 'No bids received yet. Check back later.'}
          </p>
          <Link
            href={`/scopes/${scope.id}/bids`}
            className="inline-block py-2.5 px-6 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Bids{scope.bidCount ? ` (${scope.bidCount})` : ''}
          </Link>
        </div>
      ) : isClient && scope.status === 'contracted' ? (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">View Contract</h2>
          <p className="text-sm text-text-secondary mb-4">Your contract for this scope is active.</p>
          <Link
            href="/contracts"
            className="inline-block py-2.5 px-6 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Contract
          </Link>
        </div>
      ) : !isClient && scope.status === 'open' ? (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8">
          <h2 className="text-lg font-semibold mb-2 text-center">Ready to work on this scope?</h2>
          <p className="text-sm text-text-secondary mb-5 text-center">Coordinate with your squad to build a bid together, or create one yourself.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={async () => {
                // Fetch user's squads to pick one
                const res = await fetch('/api/squads');
                const squads = await res.json();
                if (!Array.isArray(squads) || squads.length === 0) {
                  window.location.href = '/squads/new';
                  return;
                }
                // For now, use first squad — could show a picker if multiple
                const squadId = squads[0].id;
                const initRes = await fetch(`/api/scopes/${scope.id}/initiate-bid`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ squadId }),
                });
                if (initRes.ok) {
                  const data = await initRes.json();
                  window.location.href = `/bids/${data.id}/collaborate`;
                } else {
                  const errData = await initRes.json();
                  if (errData.existingBidId) {
                    // Squad already has a bid — go to its collaborate page
                    window.location.href = `/bids/${errData.existingBidId}/collaborate`;
                  }
                }
              }}
              className="py-2.5 px-6 bg-accent-squad text-white rounded-lg text-sm font-medium hover:bg-accent-squad-hover transition-colors"
            >
              Start Bid Discussion
            </button>
            <Link
              href={`/bids/new?scopeId=${scope.id}`}
              className="py-2.5 px-6 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-bg-secondary transition-colors text-center"
            >
              Express Bid (solo)
            </Link>
          </div>
        </div>
      ) : !isClient && scope.status === 'contracted' ? (
        <div className="bg-white rounded-xl border border-border p-6 sm:p-8 text-center">
          <h2 className="text-lg font-semibold mb-2">This scope has been contracted</h2>
          <p className="text-sm text-text-secondary">A squad has already been selected for this work.</p>
        </div>
      ) : null}
    </div>
  );
}
