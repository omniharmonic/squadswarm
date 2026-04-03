'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

const MOCK_CONTRACT = {
  title: 'Regenerative Finance Dashboard',
  feedbackRoundsTotal: 3,
  feedbackRoundsUsed: 0,
  startedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  totalDeliverables: 8,
  approvedDeliverables: 1,
  inProgressDeliverables: 2,
  inReviewDeliverables: 1,
  notStartedDeliverables: 3,
  blockedDeliverables: 1,
};

const BLOCKERS = [
  {
    id: 'd-8',
    title: 'Quarterly Report Template',
    assignee: 'ResearchBot (Agent)',
    workstream: 'Reporting & Export',
    reason: 'Waiting on finalized KPI definitions from client',
  },
];

const ACTIVITY_FEED = [
  {
    id: 'a1',
    icon: 'submit',
    text: 'CodeSwarm submitted Data Normalization Layer for review',
    time: '2h ago',
    isAgent: true,
  },
  {
    id: 'a2',
    icon: 'approve',
    text: 'Kai Torres approved Subgraph Integration',
    time: '5h ago',
    isAgent: false,
  },
  {
    id: 'a3',
    icon: 'move',
    text: 'Amara Osei moved Dashboard UI Components to In Review',
    time: '8h ago',
    isAgent: false,
  },
  {
    id: 'a4',
    icon: 'block',
    text: 'ResearchBot flagged Quarterly Report Template as blocked',
    time: '1d ago',
    isAgent: true,
  },
];

const ICON_MAP: Record<string, { emoji: string; bg: string }> = {
  submit: { emoji: '\u2191', bg: 'bg-escrow/10 text-escrow' },
  approve: { emoji: '\u2713', bg: 'bg-success/10 text-success' },
  move: { emoji: '\u2192', bg: 'bg-accent-client/10 text-accent-client' },
  block: { emoji: '!', bg: 'bg-error/10 text-error' },
};

export default function PMDashboardPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const c = MOCK_CONTRACT;

  const progressPercent = Math.round((c.approvedDeliverables / c.totalDeliverables) * 100);
  const daysActive = Math.floor(
    (Date.now() - new Date(c.startedAt).getTime()) / 86400000
  );

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">PM Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
            {c.title}
          </Link>
        </p>
      </div>

      {/* Progress overview */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Progress Overview</h2>
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-text-secondary">Deliverable completion</span>
          <span className="font-semibold text-text-primary">
            {c.approvedDeliverables} of {c.totalDeliverables} complete
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
            <p className="text-2xl font-bold text-success">{c.approvedDeliverables}</p>
            <p className="text-xs text-text-secondary mt-0.5">Approved</p>
          </div>
          <div className="bg-escrow/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-escrow">{c.inReviewDeliverables}</p>
            <p className="text-xs text-text-secondary mt-0.5">In Review</p>
          </div>
          <div className="bg-accent-client/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-accent-client">{c.inProgressDeliverables}</p>
            <p className="text-xs text-text-secondary mt-0.5">In Progress</p>
          </div>
          <div className="bg-bg-secondary rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-text-secondary">{c.notStartedDeliverables}</p>
            <p className="text-xs text-text-secondary mt-0.5">Not Started</p>
          </div>
          <div className="bg-error/5 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-error">{c.blockedDeliverables}</p>
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
            {c.feedbackRoundsUsed}
            <span className="text-sm font-normal text-text-secondary"> / {c.feedbackRoundsTotal} used</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Completion</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{progressPercent}%</p>
        </div>
      </div>

      {/* Blocker alerts */}
      {BLOCKERS.length > 0 && (
        <div className="bg-error/5 border border-error/20 rounded-xl p-5 mb-6">
          <h2 className="text-lg font-semibold text-error mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-error/10 flex items-center justify-center text-xs font-bold text-error">
              !
            </span>
            Blocker Alerts
          </h2>
          <div className="space-y-3">
            {BLOCKERS.map((b) => (
              <div key={b.id} className="bg-white rounded-lg border border-error/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{b.title}</p>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {b.workstream} &middot; {b.assignee}
                    </p>
                    <p className="text-sm text-text-secondary mt-2">{b.reason}</p>
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

      {/* Recent Activity Feed */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Recent Activity</h2>
        <div className="space-y-4">
          {ACTIVITY_FEED.map((a) => {
            const iconInfo = ICON_MAP[a.icon] ?? { emoji: '\u2192', bg: 'bg-accent-client/10 text-accent-client' };
            return (
              <div key={a.id} className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-bold ${iconInfo.bg}`}
                >
                  {iconInfo.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">{a.text}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{a.time}</p>
                </div>
                {a.isAgent && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-accent-agent/10 text-accent-agent shrink-0">
                    Agent
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
