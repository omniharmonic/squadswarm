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

interface ActivityItem {
  action: string;
  time: string;
  isAgent: boolean;
}

const actionLabelMap: Record<string, string> = {
  deliverable_approved: 'Deliverable approved',
  deliverable_status_changed: 'Status updated',
  workstream_completed: 'Workstream completed',
  contract_rated: 'Contract rated',
  deliverable_assigned: 'Work claimed',
  deliverable_submitted: 'Deliverable submitted',
  contract_created: 'Contract created',
  bid_accepted: 'Bid accepted',
  bid_submitted: 'Bid submitted',
  scope_published: 'Scope published',
};

function formatActionLabel(action: string): string {
  return actionLabelMap[action] || action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

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
      return `/scopes/${proposal.id}/analyze`;
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

interface Contract {
  id: string;
  title: string;
  status: string;
  squadName: string;
  clientName: string;
  totalAmount: string;
  createdAt: string;
}

export default function DashboardPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [loadingSquads, setLoadingSquads] = useState(true);
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [openScopeCount, setOpenScopeCount] = useState<number | null>(null);
  const [loadingContracts, setLoadingContracts] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [trustScore, setTrustScore] = useState<string>('-');

  useEffect(() => {
    fetch('/api/squads')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: Squad[]) => setSquads(data))
      .catch(() => {})
      .finally(() => setLoadingSquads(false));

    fetch('/api/scope-proposals')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: Proposal[]) => setProposals(data))
      .catch(() => {})
      .finally(() => setLoadingProposals(false));

    fetch('/api/contracts')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: Contract[]) => setActiveContracts(data.filter((c) => c.status === 'active' || c.status === 'pending_deposit')))
      .catch(() => {})
      .finally(() => setLoadingContracts(false));

    fetch('/api/scopes')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: Array<{ id: string }>) => setOpenScopeCount(data.length))
      .catch(() => setOpenScopeCount(0));

    // Fetch trust score
    fetch('/api/users/me/trust-score')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((data: { trustScore: number }) => setTrustScore(String(data.trustScore)))
      .catch(() => setTrustScore('-'));

    // Fetch recent activity from first contract
    fetch('/api/contracts')
      .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
      .then((contracts: Contract[]) => {
        if (contracts.length === 0) {
          setLoadingActivity(false);
          return;
        }
        const firstContract = contracts[0]!;
        return fetch(`/api/contracts/${firstContract.id}/activity`)
          .then((res) => { if (!res.ok) throw new Error('Failed'); return res.json(); })
          .then((activities: Array<{ action: string; timestamp: string; isAgent?: boolean }>) => {
            const mapped: ActivityItem[] = activities.map((a) => {
              const date = new Date(a.timestamp);
              let time: string;
              if (isNaN(date.getTime())) {
                time = 'recently';
              } else {
                const now = new Date();
                const diffMs = now.getTime() - date.getTime();
                const diffMins = Math.floor(diffMs / 60000);
                if (diffMins < 1) time = 'just now';
                else if (diffMins < 60) time = `${diffMins}m ago`;
                else if (diffMins < 1440) time = `${Math.floor(diffMins / 60)}h ago`;
                else time = `${Math.floor(diffMins / 1440)}d ago`;
              }
              return { action: formatActionLabel(a.action), time, isAgent: a.isAgent ?? false };
            });
            setRecentActivity(mapped);
          });
      })
      .catch(() => {})
      .finally(() => setLoadingActivity(false));
  }, []);

  const isLoading = loadingSquads || loadingProposals || loadingContracts;

  const quickStats = [
    {
      label: 'Active Squads',
      value: isLoading ? '-' : String(squads.length || 0),
      color: 'bg-accent-agent/10 text-accent-agent',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Open Scopes',
      value: openScopeCount === null ? '-' : String(openScopeCount),
      color: 'bg-accent-squad/10 text-accent-squad',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      label: 'Your Proposals',
      value: isLoading ? '-' : String(proposals.length || 0),
      color: 'bg-accent-client/10 text-accent-client',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      label: 'Trust Score',
      value: trustScore,
      color: 'bg-success/10 text-success',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
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
            className="bg-white rounded-xl border border-border p-5"
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-bold text-text-primary">{stat.value}</div>
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
        {/* Active Contracts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Active Contracts</h2>
          {loadingContracts ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : activeContracts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-text-secondary mb-3">No active contracts. Browse scopes to find work.</p>
              <Link href="/scopes" className="inline-block py-2 px-4 bg-accent-client text-white rounded-lg text-sm font-medium hover:opacity-90">
                Browse Scopes
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {activeContracts.map((c) => (
                <Link key={c.id} href={`/contracts/${c.id}/board`}
                  className="block p-4 bg-bg-primary rounded-lg border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-sm">{c.title}</h3>
                    <span className="text-xs px-2 py-1 bg-success/10 text-success rounded-full font-medium capitalize">
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span>Client: {c.clientName}</span>
                    <span>Squad: {c.squadName}</span>
                    {c.totalAmount && <span>${Number(c.totalAmount).toLocaleString()}</span>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          {loadingActivity ? (
            <div className="text-center py-6">
              <div className="w-6 h-6 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-6">No recent activity</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((item, i) => (
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
          )}
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
