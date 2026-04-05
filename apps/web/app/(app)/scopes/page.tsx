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

const thresholdScores: Record<string, number> = {
  open: 0,
  verified: 25,
  trusted: 50,
  elite: 75,
};

function TrustThresholdBadge({ threshold }: { threshold: string }) {
  const minScore = thresholdScores[threshold] ?? 0;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium capitalize ${trustColors[threshold] ?? trustColors.open}`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      </svg>
      {threshold}{minScore > 0 ? ` ${minScore}+` : ''}
    </span>
  );
}

interface RecommendedScope {
  id: string;
  title: string;
  categoryTags: string[] | null;
  budgetMin: string | null;
  budgetMax: string | null;
  matchScore: number;
}

interface UserSquadInfo {
  id: string;
  name: string;
  trustScore: number;
}

function ScopeCard({ scope, userSquads }: { scope: ScopeItem; userSquads?: UserSquadInfo[] }) {
  const threshold = scope.trustThreshold || 'open';
  const required = thresholdScores[threshold] ?? 0;
  const hasSquads = userSquads && userSquads.length > 0;
  const canAnySquadBid = !hasSquads || threshold === 'open' || userSquads.some(s => s.trustScore >= required);

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
        <div className="flex items-center gap-1.5">
          <TrustThresholdBadge threshold={scope.trustThreshold || 'open'} />
          {hasSquads && !canAnySquadBid && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-warning/10 text-warning" title={`Requires trust score >= ${required}`}>
              <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              Locked
            </span>
          )}
        </div>
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
  const [recommended, setRecommended] = useState<RecommendedScope[]>([]);
  const [userSquads, setUserSquads] = useState<UserSquadInfo[]>([]);

  useEffect(() => {
    fetch('/api/scopes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((fetched: ScopeItem[]) => {
        setRealScopes(fetched);
        const realTitles = new Set(fetched.map((s) => s.title.toLowerCase()));
        setMockScopes(MOCK_SCOPES.filter((m) => !realTitles.has(m.title.toLowerCase())));
      })
      .catch(() => {
        // On error (e.g. not authenticated), keep mock data as fallback
      })
      .finally(() => setLoading(false));

    // Fetch recommended scopes
    fetch('/api/scopes/recommended')
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) setRecommended(data);
      })
      .catch(() => {
        // silently fail — no recommendations shown
      });

    // Fetch user's squads for threshold checking
    fetch('/api/squads')
      .then((res) => {
        if (!res.ok) throw new Error('Failed');
        return res.json();
      })
      .then((squads) => {
        if (Array.isArray(squads)) {
          setUserSquads(squads.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            trustScore: s.trustScore ? Number(s.trustScore) : 0,
          })));
        }
      })
      .catch(() => {});
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

      {/* Recommended for Your Squads */}
      {recommended.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-text-primary mb-3">Recommended for Your Squads</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {recommended.map((scope) => (
              <Link
                key={scope.id}
                href={`/scopes/${scope.id}`}
                className="min-w-[260px] max-w-[300px] bg-white rounded-xl border border-border p-4 hover:shadow-md transition-shadow flex-shrink-0"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2 flex-1">
                    {scope.title}
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-success/10 text-success whitespace-nowrap">
                    {scope.matchScore}% match
                  </span>
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {(scope.categoryTags ?? []).slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-1.5 py-0.5 bg-bg-secondary text-text-secondary text-[10px] rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-text-secondary">
                  {formatBudget(scope.budgetMin, scope.budgetMax)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

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
                <ScopeCard key={scope.id} scope={scope} userSquads={userSquads} />
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
                  <ScopeCard key={scope.id} scope={scope} userSquads={userSquads} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
