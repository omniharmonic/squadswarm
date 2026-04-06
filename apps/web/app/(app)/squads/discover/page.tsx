'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { TrustScoreRing } from '@/components/trust-score-ring';
import { SkillBadge } from '@/components/skill-badge';

interface SquadSkill {
  name: string;
  slug: string;
  category: string;
  memberCount: number;
  totalAttestations: number;
}

interface SquadResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  trustScore: number;
  memberCount: number;
  skills: SquadSkill[];
  matchScore: number;
  completedContracts: number;
}

interface SearchResponse {
  squads: SquadResult[];
  pagination: { page: number; limit: number; total: number; hasMore: boolean };
  filters: { skills: string[]; category: string | null; query: string | null };
}

interface PopularSkill {
  id: string;
  name: string;
  slug: string;
  category: string;
  usageCount: number;
  practitionerCount: number;
}

const TRUST_THRESHOLDS = [
  { label: 'Open', value: 0 },
  { label: 'Verified 25+', value: 25 },
  { label: 'Trusted 50+', value: 50 },
  { label: 'Elite 75+', value: 75 },
];

const CATEGORIES = [
  { label: 'All Categories', value: '' },
  { label: 'Frontend', value: 'frontend' },
  { label: 'Backend', value: 'backend' },
  { label: 'Design', value: 'design' },
  { label: 'Data', value: 'data' },
  { label: 'DevOps', value: 'devops' },
  { label: 'AI / ML', value: 'ai_ml' },
  { label: 'Blockchain', value: 'blockchain' },
  { label: 'Business', value: 'business' },
  { label: 'Writing', value: 'writing' },
];

export default function SquadDiscoverPage() {
  const [query, setQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [popularSkills, setPopularSkills] = useState<PopularSkill[]>([]);

  // Fetch popular skills on mount
  useEffect(() => {
    fetch('/api/skills/popular?limit=12')
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPopularSkills(data);
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (p: number) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSkills.length > 0) params.set('skills', selectedSkills.join(','));
      if (category) params.set('category', category);
      if (query.trim()) params.set('q', query.trim());
      if (minScore > 0) params.set('minScore', String(minScore));
      params.set('page', String(p));
      params.set('limit', '12');

      try {
        const res = await fetch(`/api/squads/search?${params.toString()}`);
        if (res.ok) {
          const data: SearchResponse = await res.json();
          setResults(data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [selectedSkills, category, query, minScore]
  );

  // Search on filter changes
  useEffect(() => {
    setPage(1);
    doSearch(1);
  }, [doSearch]);

  const toggleSkill = (slug: string) => {
    setSelectedSkills((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const removeSkill = (slug: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== slug));
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    doSearch(newPage);
  };

  const hasSkillFilter = selectedSkills.length > 0;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Find a Squad</h1>
        <p className="text-text-secondary mt-1">
          Search by skills, expertise, and reputation
        </p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6 space-y-4">
        {/* Text search */}
        <div>
          <input
            type="text"
            placeholder="Search squads by name or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-border rounded-xl bg-bg-primary px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3">
          {/* Category dropdown */}
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-border rounded-xl bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Trust threshold */}
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="border border-border rounded-xl bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
          >
            {TRUST_THRESHOLDS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Selected skill tags */}
        {selectedSkills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-text-secondary self-center">Filtering by:</span>
            {selectedSkills.map((slug) => {
              const skill = popularSkills.find((s) => s.slug === slug);
              return (
                <button
                  key={slug}
                  onClick={() => removeSkill(slug)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent-agent/10 text-accent-agent border border-accent-agent/20 hover:bg-accent-agent/20 transition-colors"
                >
                  {skill?.name ?? slug}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              );
            })}
            <button
              onClick={() => setSelectedSkills([])}
              className="text-xs text-text-muted hover:text-text-secondary underline"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Popular Skills */}
      {popularSkills.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-text-secondary mb-3 uppercase tracking-wider">
            Popular Skills
          </h2>
          <div className="flex flex-wrap gap-2">
            {popularSkills.map((skill) => (
              <button
                key={skill.slug}
                onClick={() => toggleSkill(skill.slug)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                  selectedSkills.includes(skill.slug)
                    ? 'bg-accent-agent text-white border-accent-agent'
                    : 'bg-bg-secondary text-text-secondary border-border hover:border-accent-agent/40 hover:text-text-primary'
                }`}
              >
                {skill.name}
                {selectedSkills.includes(skill.slug) && (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : results && results.squads.length > 0 ? (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-text-secondary">
              {results.pagination.total} squad{results.pagination.total !== 1 ? 's' : ''} found
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {results.squads.map((squad) => (
              <SquadCard
                key={squad.id}
                squad={squad}
                hasSkillFilter={hasSkillFilter}
              />
            ))}
          </div>

          {/* Pagination */}
          {(results.pagination.hasMore || page > 1) && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 text-sm rounded-xl border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary">
                Page {page} of {Math.ceil(results.pagination.total / results.pagination.limit)}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={!results.pagination.hasMore}
                className="px-4 py-2 text-sm rounded-xl border border-border text-text-secondary hover:bg-bg-secondary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </>
      ) : results ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-bg-secondary flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-1">No squads found</h3>
          <p className="text-text-secondary text-sm">
            No squads found matching your criteria. Try adjusting your filters.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function SquadCard({ squad, hasSkillFilter }: { squad: SquadResult; hasSkillFilter: boolean }) {
  return (
    <Link
      href={`/squads/${squad.slug || squad.id}`}
      className="bg-white rounded-2xl border border-border p-5 hover:shadow-md transition-shadow group flex flex-col"
    >
      {/* Header: name + trust ring */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-text-primary group-hover:text-accent-squad transition-colors line-clamp-1">
            {squad.name}
          </h3>
          {squad.description && (
            <p className="text-sm text-text-secondary line-clamp-2 mt-1">
              {squad.description}
            </p>
          )}
        </div>
        <div className="shrink-0">
          <TrustScoreRing score={squad.trustScore} size="sm" />
        </div>
      </div>

      {/* Skills */}
      {squad.skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {squad.skills.slice(0, 5).map((skill) => (
            <SkillBadge
              key={skill.slug}
              name={skill.name}
              category={skill.category}
              size="sm"
            />
          ))}
          {squad.skills.length > 5 && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs text-text-muted bg-bg-secondary">
              +{squad.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
        <div className="flex items-center gap-4 text-xs text-text-secondary">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {squad.memberCount} member{squad.memberCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {squad.completedContracts} completed
          </span>
        </div>

        {hasSkillFilter && (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
              squad.matchScore >= 80
                ? 'bg-success/10 text-success'
                : squad.matchScore >= 50
                  ? 'bg-accent-client/10 text-accent-client'
                  : 'bg-warning/10 text-warning'
            }`}
          >
            {squad.matchScore}% match
          </span>
        )}
      </div>
    </Link>
  );
}
