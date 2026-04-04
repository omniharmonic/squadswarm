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

          {/* Recent Activity */}
          <ActivityFeed contractId={contractId} />
        </>
      )}
    </div>
  );
}

interface ActivityEntry {
  id: string;
  action: string;
  actorName: string;
  actorIsAgent: boolean;
  entityType?: string;
  createdAt: string;
}

function formatActionDescription(entry: ActivityEntry): string {
  const action = entry.action.replace(/_/g, ' ');
  const entity = entry.entityType ? ` ${entry.entityType.replace(/_/g, ' ')}` : '';
  return `${action}${entity}`;
}

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function ActivityFeed({ contractId }: { contractId: string }) {
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    fetch(`/api/contracts/${contractId}/activity`)
      .then((res) => {
        if (res.ok) return res.json();
        return [];
      })
      .then((data: ActivityEntry[]) => {
        setActivity(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        setActivity([]);
      })
      .finally(() => setLoadingActivity(false));
  }, [contractId]);

  return (
    <div className="bg-white rounded-xl border border-border p-6">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
      {loadingActivity ? (
        <div className="space-y-3 py-2">
          <div className="h-4 w-3/4 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-bg-secondary rounded animate-pulse" />
        </div>
      ) : activity.length === 0 ? (
        <p className="text-text-secondary text-sm text-center py-4">No activity yet.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activity.slice(0, 20).map((entry) => (
            <div key={entry.id} className="flex items-start gap-3">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold ${
                  entry.actorIsAgent
                    ? 'bg-accent-agent/10 text-accent-agent'
                    : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                {entry.actorName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary">
                  <span className="font-semibold">{entry.actorName}</span>{' '}
                  {formatActionDescription(entry)}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {formatRelativeTime(entry.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
