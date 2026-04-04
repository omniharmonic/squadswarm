'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ScopeItem {
  id: string;
  title: string;
  categoryTags: string[] | null;
  budgetMin: string | null;
  budgetMax: string | null;
  timelineDays: number | null;
  trustThreshold: string | null;
  biddingDeadline: string | null;
  status: string;
  narrative: string | null;
  _isMock?: boolean;
}

const MOCK_SCOPES: ScopeItem[] = [
  {
    id: 'mock-1',
    title: 'Build a Regenerative Finance Dashboard',
    categoryTags: ['web development', 'DeFi', 'data visualization'],
    budgetMin: '5000',
    budgetMax: '12000',
    timelineDays: 30,
    trustThreshold: 'verified',
    biddingDeadline: new Date(Date.now() + 5 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'We need a web dashboard that visualizes regenerative finance metrics...',
    _isMock: true,
  },
  {
    id: 'mock-2',
    title: 'Community Governance Toolkit Documentation',
    categoryTags: ['technical writing', 'governance', 'open source'],
    budgetMin: '2000',
    budgetMax: '4000',
    timelineDays: 14,
    trustThreshold: 'open',
    biddingDeadline: new Date(Date.now() + 3 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'Write comprehensive documentation for our governance toolkit...',
    _isMock: true,
  },
  {
    id: 'mock-3',
    title: 'AI Agent Integration for Supply Chain Tracking',
    categoryTags: ['AI/ML', 'supply chain', 'smart contracts'],
    budgetMin: '15000',
    budgetMax: '25000',
    timelineDays: 60,
    trustThreshold: 'trusted',
    biddingDeadline: new Date(Date.now() + 10 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'Integrate AI agents to track and verify supply chain data...',
    _isMock: true,
  },
  {
    id: 'mock-4',
    title: 'Mobile App for Cooperative Membership',
    categoryTags: ['mobile', 'React Native', 'cooperatives'],
    budgetMin: '8000',
    budgetMax: '15000',
    timelineDays: 45,
    trustThreshold: 'verified',
    biddingDeadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'Build a mobile application for managing cooperative memberships...',
    _isMock: true,
  },
  {
    id: 'mock-5',
    title: 'Carbon Credit Verification Smart Contract Audit',
    categoryTags: ['smart contracts', 'security', 'sustainability'],
    budgetMin: '10000',
    budgetMax: '18000',
    timelineDays: 21,
    trustThreshold: 'elite',
    biddingDeadline: new Date(Date.now() + 2 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'Perform a security audit of our carbon credit verification contracts...',
    _isMock: true,
  },
  {
    id: 'mock-6',
    title: 'Brand Identity for Regenerative Agriculture Platform',
    categoryTags: ['design', 'branding', 'agriculture'],
    budgetMin: '3000',
    budgetMax: '6000',
    timelineDays: 21,
    trustThreshold: 'open',
    biddingDeadline: new Date(Date.now() + 8 * 86400000).toISOString(),
    status: 'open',
    narrative:
      'Design a complete brand identity for our regenerative agriculture platform...',
    _isMock: true,
  },
];

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

function TrustBadge({ threshold }: { threshold: string }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${trustColors[threshold] ?? trustColors.open}`}
    >
      {threshold}
    </span>
  );
}

function ScopeCard({ scope }: { scope: ScopeItem }) {
  return (
    <Link
      href={scope._isMock ? '#' : `/scopes/${scope.id}`}
      className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
      onClick={scope._isMock ? (e: React.MouseEvent) => e.preventDefault() : undefined}
    >
      {/* Title */}
      <h2 className="text-base font-semibold text-text-primary line-clamp-2 group-hover:text-accent-squad transition-colors mb-2">
        {scope.title}
      </h2>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {(scope.categoryTags ?? []).map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 bg-bg-secondary text-text-secondary text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Budget & Timeline */}
      <div className="space-y-1.5 text-sm mb-3">
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Budget</span>
          <span className="font-medium text-text-primary">
            {formatBudget(scope.budgetMin, scope.budgetMax)}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-text-secondary">Timeline</span>
          <span className="font-medium text-text-primary">
            {scope.timelineDays ? `${scope.timelineDays} days` : 'Flexible'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <TrustBadge threshold={scope.trustThreshold || 'open'} />
        <span className="text-xs text-text-secondary">
          {scope.biddingDeadline ? daysLeft(scope.biddingDeadline) : ''}
        </span>
      </div>
    </Link>
  );
}

export default function ScopeBoardPage() {
  const [realScopes, setRealScopes] = useState<ScopeItem[]>([]);
  const [mockScopes, setMockScopes] = useState<ScopeItem[]>(MOCK_SCOPES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/scopes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((fetched: ScopeItem[]) => {
        setRealScopes(fetched);
        // Deduplicate: remove mocks whose titles match a real scope
        const realTitles = new Set(fetched.map((s) => s.title.toLowerCase()));
        setMockScopes(MOCK_SCOPES.filter((m) => !realTitles.has(m.title.toLowerCase())));
      })
      .catch(() => {
        // On error (e.g. not authenticated), keep mock data as fallback
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Scope Board</h1>
          <p className="text-text-secondary mt-1">
            Browse and bid on project scopes posted by clients.
          </p>
        </div>
        <Link
          href="/scopes/new"
          className="py-2.5 px-5 bg-accent-squad text-white rounded-lg text-sm font-medium
                     hover:opacity-90 transition-opacity"
        >
          Submit a Scope
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Real scopes */}
          {realScopes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {realScopes.map((scope) => (
                <ScopeCard key={scope.id} scope={scope} />
              ))}
            </div>
          )}

          {/* Example scopes divider + cards */}
          {mockScopes.length > 0 && (
            <>
              {realScopes.length > 0 && (
                <div className="flex items-center gap-3 my-8">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                    Example Scopes
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {mockScopes.map((scope) => (
                  <ScopeCard key={scope.id} scope={scope} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
