'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Deliverable {
  id: string;
  title: string;
  status: string;
  assignee: string;
}

interface Workstream {
  id: string;
  title: string;
  deliverables: Deliverable[];
}

interface ContractData {
  title: string;
  feedbackRoundsTotal: number;
  feedbackRoundsUsed: number;
  startedAt: string | null;
  workstreams: Workstream[];
}

export default function PMDashboardPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [contract, setContract] = useState<ContractData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchContract() {
      try {
        const res = await fetch(`/api/contracts/${contractId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setContract({
          title: data.title,
          feedbackRoundsTotal: data.feedbackRoundsTotal ?? 3,
          feedbackRoundsUsed: data.feedbackRoundsUsed ?? 0,
          startedAt: data.startedAt || data.createdAt || null,
          workstreams: (data.workstreams || []).map((ws: Record<string, unknown>) => ({
            id: ws.id,
            title: ws.title,
            deliverables: ((ws.deliverables as Record<string, unknown>[]) || []).map((d: Record<string, unknown>) => ({
              id: d.id,
              title: d.title,
              status: d.status || 'not_started',
              assignee: d.assignee || 'Unassigned',
            })),
          })),
        });
      } catch {
        // Leave contract as null on failure
      } finally {
        setLoading(false);
      }
    }
    fetchContract();
  }, [contractId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <div className="h-5 w-48 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="max-w-4xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary">PM Dashboard</h1>
        </div>
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load contract data</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const allDeliverables = contract.workstreams.flatMap((ws) => ws.deliverables);
  const totalDeliverables = allDeliverables.length;
  const approvedDeliverables = allDeliverables.filter((d) => d.status === 'approved').length;
  const inReviewDeliverables = allDeliverables.filter((d) => d.status === 'in_review').length;
  const inProgressDeliverables = allDeliverables.filter((d) => d.status === 'in_progress').length;
  const notStartedDeliverables = allDeliverables.filter((d) => d.status === 'not_started').length;
  const blockedDeliverables = allDeliverables.filter((d) => d.status === 'blocked').length;
  const progressPercent = totalDeliverables > 0 ? Math.round((approvedDeliverables / totalDeliverables) * 100) : 0;
  const daysActive = contract.startedAt
    ? Math.floor((Date.now() - new Date(contract.startedAt).getTime()) / 86400000)
    : 0;

  const blockers = contract.workstreams.flatMap((ws) =>
    ws.deliverables
      .filter((d) => d.status === 'blocked')
      .map((d) => ({ ...d, workstream: ws.title }))
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">PM Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
            {contract.title}
          </Link>
        </p>
      </div>

      {totalDeliverables === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">No deliverables yet</h3>
          <p className="text-text-secondary text-sm">Deliverables will appear here once they are added to this contract.</p>
        </div>
      ) : (
        <>
          {/* Progress overview */}
          <div className="bg-white rounded-xl border border-border p-6 mb-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Progress Overview</h2>
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-text-secondary">Deliverable completion</span>
              <span className="font-semibold text-text-primary">
                {approvedDeliverables} of {totalDeliverables} complete
              </span>
            </div>
            <div className="w-full h-3 bg-bg-secondary rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Status breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-success/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-success">{approvedDeliverables}</p>
                <p className="text-xs text-text-secondary mt-0.5">Approved</p>
              </div>
              <div className="bg-escrow/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-escrow">{inReviewDeliverables}</p>
                <p className="text-xs text-text-secondary mt-0.5">In Review</p>
              </div>
              <div className="bg-accent-client/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-accent-client">{inProgressDeliverables}</p>
                <p className="text-xs text-text-secondary mt-0.5">In Progress</p>
              </div>
              <div className="bg-bg-secondary rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-secondary">{notStartedDeliverables}</p>
                <p className="text-xs text-text-secondary mt-0.5">Not Started</p>
              </div>
              <div className="bg-error/5 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-error">{blockedDeliverables}</p>
                <p className="text-xs text-text-secondary mt-0.5">Blocked</p>
              </div>
            </div>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Days Active</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{daysActive}</p>
            </div>
            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Feedback Rounds</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {contract.feedbackRoundsUsed}
                <span className="text-sm font-normal text-text-secondary"> / {contract.feedbackRoundsTotal} used</span>
              </p>
            </div>
            <div className="bg-white rounded-xl border border-border p-5">
              <p className="text-xs text-text-secondary uppercase tracking-wide">Completion</p>
              <p className="text-2xl font-bold text-text-primary mt-1">{progressPercent}%</p>
            </div>
          </div>

          {/* Blocker alerts */}
          {blockers.length > 0 && (
            <div className="bg-error/5 border border-error/20 rounded-xl p-5 mb-6">
              <h2 className="text-lg font-semibold text-error mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center text-xs font-bold text-error">
                  !
                </span>
                Blocker Alerts
              </h2>
              <div className="space-y-3">
                {blockers.map((b) => (
                  <div key={b.id} className="bg-white rounded-lg border border-error/10 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{b.title}</p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {b.workstream} &middot; {b.assignee}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-error/10 text-error shrink-0">
                        Blocked
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Activity — empty state since we don't have an activity API yet */}
          <div className="bg-white rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
            <p className="text-text-secondary text-sm text-center py-4">No activity yet.</p>
          </div>
        </>
      )}
    </div>
  );
}
