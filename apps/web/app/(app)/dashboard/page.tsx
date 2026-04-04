'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Squad {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  role: string;
  createdAt: string;
}

interface Proposal {
  id: string;
  title: string;
  status: string;
  categoryTags: string[] | null;
  budgetMin: string | null;
  budgetMax: string | null;
  createdAt: string;
  updatedAt: string;
}

const RECENT_ACTIVITY = [
  {
    action: 'CodeSwarm submitted Data Normalization Layer for review',
    time: '2 hours ago',
    isAgent: true,
  },
  {
    action: 'Kai Torres approved Subgraph Integration',
    time: '5 hours ago',
    isAgent: false,
  },
  {
    action: 'New scope posted: Carbon Credit Verification Audit',
    time: '8 hours ago',
    isAgent: false,
  },
  {
    action: 'ResearchBot drafted tooltip copy for impact metrics',
    time: '1 day ago',
    isAgent: true,
  },
];

const proposalStatusColors: Record<string, string> = {
  draft: 'bg-bg-secondary text-text-secondary',
  analyzing: 'bg-accent-agent/10 text-accent-agent',
  ready: 'bg-accent-client/10 text-accent-client',
  published: 'bg-success/10 text-success',
};

function proposalLink(proposal: Proposal): string {
  switch (proposal.status) {
    case 'draft':
      return '/scopes/new';
    case 'analyzing':
    case 'ready':
      return `/scope-proposals/${proposal.id}/analyze`;
    case 'published':
      return `/scopes/${proposal.id}`;
    default:
      return `/scope-proposals/${proposal.id}`;
  }
}

function proposalLinkLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Edit';
    case 'analyzing':
    case 'ready':
      return 'View Analysis';
    case 'published':
      return 'View Scope';
    default:
      return 'View';
  }
}

export default function DashboardPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);

  useEffect(() => {
    fetch('/api/squads')
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data: Squad[]) => setSquads(data))
      .catch(() => {})
      .finally(() => setLoadingSquads(false));

    fetch('/api/scope-proposals')
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data: Proposal[]) => setProposals(data))
      .catch(() => {})
      .finally(() => setLoadingProposals(false));
  }, []);

  const isLoading = loadingSquads || loadingProposals;

  const quickStats = [
    { label: 'Active Squads', value: isLoading ? '-' : String(squads.length || 0), icon: '\uD83D\uDC65' },
    { label: 'Open Scopes', value: '6', icon: '\uD83D\uDCCB' },
    { label: 'Your Proposals', value: isLoading ? '-' : String(proposals.length || 0), icon: '\uD83D\uDCDD' },
    { label: 'Trust Score', value: '85', icon: '\u2B50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        <p className="text-text-secondary mt-1">Here&apos;s what&apos;s happening across your squads.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-border p-4 text-center"
          >
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-text-secondary mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Your Proposals */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Proposals</h2>
          <Link href="/scopes/new" className="text-sm text-accent-squad hover:underline">
            New Proposal
          </Link>
        </div>
        {loadingProposals ? (
          <div className="text-center py-6">
            <div className="w-6 h-6 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-secondary mb-3">No proposals yet — Submit a scope to get started</p>
            <Link
              href="/scopes/new"
              className="inline-block py-2 px-4 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Submit a Scope
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal) => (
              <Link
                key={proposal.id}
                href={proposalLink(proposal)}
                className="block p-4 bg-bg-primary rounded-lg border border-border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-medium text-sm">{proposal.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${proposalStatusColors[proposal.status] ?? proposalStatusColors.draft}`}
                  >
                    {proposal.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  {proposal.categoryTags && proposal.categoryTags.length > 0 && (
                    <span>{proposal.categoryTags.slice(0, 2).join(', ')}</span>
                  )}
                  {proposal.budgetMin && proposal.budgetMax && (
                    <span>
                      ${Number(proposal.budgetMin).toLocaleString()} - ${Number(proposal.budgetMax).toLocaleString()}
                    </span>
                  )}
                  <span className="ml-auto text-accent-squad font-medium">
                    {proposalLinkLabel(proposal.status)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Your Squads (real data) */}
      {!loadingSquads && squads.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Squads</h2>
            <Link href="/squads/new" className="text-sm text-accent-squad hover:underline">
              Create Squad
            </Link>
          </div>
          <div className="space-y-3">
            {squads.map((squad) => (
              <Link
                key={squad.id}
                href={`/squads/${squad.slug}`}
                className="block p-4 bg-bg-primary rounded-lg border border-border hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm">{squad.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize bg-accent-agent/10 text-accent-agent">
                    {squad.role}
                  </span>
                </div>
                {squad.bio && (
                  <p className="text-xs text-text-secondary line-clamp-1">{squad.bio}</p>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Contract */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Active Contract</h2>
            <Link href="/contracts/mock-contract-1" className="text-sm text-accent-squad hover:underline">
              View all
            </Link>
          </div>
          <Link
            href="/contracts/mock-contract-1/board"
            className="block p-4 bg-bg-primary rounded-lg border border-border hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Regenerative Finance Dashboard</h3>
              <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full font-medium">
                Active
              </span>
            </div>
            <p className="text-sm text-text-secondary mb-3">
              Building a data visualization dashboard for ReFi impact metrics.
            </p>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span>Client: Climate DAO</span>
              <span>Squad: Regen Builders</span>
              <span>$12,000</span>
            </div>
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary">Deliverables</span>
                <span className="font-medium">2 of 8 approved</span>
              </div>
              <div className="h-2 bg-bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: '25%' }} />
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-4">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    item.isAgent ? 'bg-accent-agent' : 'bg-accent-squad'
                  }`}
                />
                <div>
                  <p className="text-sm leading-snug">{item.action}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Link
          href="/scopes"
          className="bg-accent-squad/5 border border-accent-squad/20 rounded-xl p-5 hover:bg-accent-squad/10 transition-colors"
        >
          <h3 className="font-semibold text-accent-squad mb-1">Browse Scopes</h3>
          <p className="text-sm text-text-secondary">Find new work for your squad.</p>
        </Link>
        <Link
          href="/scopes/new"
          className="bg-accent-client/5 border border-accent-client/20 rounded-xl p-5 hover:bg-accent-client/10 transition-colors"
        >
          <h3 className="font-semibold text-accent-client mb-1">Submit a Scope</h3>
          <p className="text-sm text-text-secondary">Post work for squads to bid on.</p>
        </Link>
        <Link
          href="/squads/new"
          className="bg-accent-agent/5 border border-accent-agent/20 rounded-xl p-5 hover:bg-accent-agent/10 transition-colors"
        >
          <h3 className="font-semibold text-accent-agent mb-1">Create a Squad</h3>
          <p className="text-sm text-text-secondary">Form your cooperative team.</p>
        </Link>
      </div>
    </div>
  );
}
