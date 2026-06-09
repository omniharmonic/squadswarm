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
      href={`/scopes/${scope.id}`}
      className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedScope[]>([]);
  const [userSquads, setUserSquads] = useState<UserSquadInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/scopes')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then((fetched: ScopeItem[]) => {
        setRealScopes(fetched);
        setLoadError(false);
      })
      .catch(() => {
        // Surface a real error state instead of showing fabricated listings.
        setLoadError(true);
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

  const allTags = [...new Set(realScopes.flatMap(s => s.categoryTags || []))].sort();

  // Filter scopes based on search query and selected tag
  const filterScope = (scope: ScopeItem) => {
    const matchesSearch = !searchQuery ||
      scope.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.narrative?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = !selectedTag ||
      (scope.categoryTags || []).includes(selectedTag);

    return matchesSearch && matchesTag;
  };

  const filteredRealScopes = realScopes.filter(filterScope);
  const totalFiltered = filteredRealScopes.length;
  const isFiltering = !!searchQuery || !!selectedTag;

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

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-2xl border border-border p-4 mb-6">
        <input
          type="text"
          placeholder="Search scopes by title or description..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-border rounded-xl bg-bg-primary text-sm focus:ring-2 focus:ring-accent-agent/40 focus:outline-none"
        />

        {/* Category tag pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedTag === tag
                    ? 'bg-accent-squad text-white border-accent-squad'
                    : 'bg-bg-secondary text-text-secondary border-border hover:border-accent-agent/40'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Result count when filtering */}
      {isFiltering && (
        <p className="text-sm text-text-muted mb-4">
          {totalFiltered} scope{totalFiltered !== 1 ? 's' : ''} found
          {searchQuery && ` for "${searchQuery}"`}
          {selectedTag && ` tagged "${selectedTag}"`}
        </p>
      )}

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
      ) : loadError ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-border">
          <p className="text-text-secondary">We couldn&apos;t load the scope board.</p>
          <button
            onClick={() => { setLoading(true); setLoadError(false); window.location.reload(); }}
            className="mt-2 text-sm text-accent-agent hover:text-accent-agent-hover transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <>
          {/* Real scopes */}
          {filteredRealScopes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredRealScopes.map((scope) => (
                <ScopeCard key={scope.id} scope={scope} userSquads={userSquads} />
              ))}
            </div>
          )}

          {/* Empty state — no scopes posted yet */}
          {!isFiltering && realScopes.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-border">
              <h3 className="text-lg font-semibold text-text-primary">No open scopes yet</h3>
              <p className="text-text-secondary mt-1 max-w-md mx-auto">
                There are no scopes open for bidding right now. Have work that needs doing?
              </p>
              <Link
                href="/scopes/new"
                className="inline-block mt-4 py-2.5 px-5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Submit a Scope
              </Link>
            </div>
          )}

          {/* No results message when filtering */}
          {isFiltering && totalFiltered === 0 && (
            <div className="text-center py-12">
              <p className="text-text-secondary">No scopes match your search.</p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedTag(null); }}
                className="mt-2 text-sm text-accent-agent hover:text-accent-agent-hover transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
