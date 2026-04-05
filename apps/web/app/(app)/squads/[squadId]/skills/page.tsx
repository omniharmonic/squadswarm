'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { TrustScoreRing } from '@/components/trust-score-ring';
import { SkillBadge } from '@/components/skill-badge';

interface SquadInfo {
  id: string;
  name: string;
  trustScore: string;
}

interface SquadTrustData {
  trustScore: number;
  memberScores?: {
    userId: string;
    displayName: string;
    trustScore: number;
    skills?: {
      skillName: string;
      skillSlug: string;
      category: string;
      proficiencyLevel: string;
      attestationCount: number;
    }[];
  }[];
}

interface AggregatedSkill {
  name: string;
  category: string;
  memberCount: number;
  totalAttestations: number;
  topMember: string;
}

export default function SquadSkillsPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [squad, setSquad] = useState<SquadInfo | null>(null);
  const [trustData, setTrustData] = useState<SquadTrustData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch squad info
        const squadRes = await fetch(`/api/squads/${squadId}`);
        if (squadRes.ok) {
          const squadJson = await squadRes.json();
          if (!cancelled) setSquad(squadJson);
        }

        // Fetch squad trust score (includes member breakdown)
        const trustRes = await fetch(`/api/squads/${squadId}/trust-score`);
        if (trustRes.ok) {
          const trustJson = await trustRes.json();
          if (!cancelled) setTrustData(trustJson);
        }
      } catch {
        // Silently handle - pages degrade gracefully
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [squadId]);

  // Aggregate skills from all members
  const skillMap = new Map<string, AggregatedSkill>();
  if (trustData?.memberScores) {
    for (const member of trustData.memberScores) {
      if (!member.skills) continue;
      for (const skill of member.skills) {
        const existing = skillMap.get(skill.skillName);
        if (existing) {
          existing.memberCount++;
          existing.totalAttestations += skill.attestationCount;
          if (skill.attestationCount > 0 && !existing.topMember) {
            existing.topMember = member.displayName;
          }
        } else {
          skillMap.set(skill.skillName, {
            name: skill.skillName,
            category: skill.category,
            memberCount: 1,
            totalAttestations: skill.attestationCount,
            topMember: member.displayName,
          });
        }
      }
    }
  }

  const allSkills = Array.from(skillMap.values());
  const categories = [...new Set(allSkills.map((s) => s.category))].sort();

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  // Expand all categories by default on first render with data
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories));
    }
  }, [categories.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const squadScore = trustData?.trustScore ?? Number(squad?.trustScore ?? 0);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/squads/${squadId}`}
              className="text-sm text-accent-agent hover:text-accent-agent-hover"
            >
              &larr; {squad?.name ?? 'Squad'}
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Capability Matrix</h1>
          <p className="text-text-secondary mt-1">
            {allSkills.length > 0
              ? `${allSkills.length} skill${allSkills.length !== 1 ? 's' : ''} across ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}`
              : 'Skills are earned by completing contract deliverables'}
          </p>
        </div>
        <TrustScoreRing
          score={squadScore}
          size="md"
          showLabel
          label="Squad Score"
          colorByThreshold
        />
      </div>

      {allSkills.length > 0 ? (
        <div className="space-y-4">
          {categories.map((cat) => {
            const catSkills = allSkills
              .filter((s) => s.category === cat)
              .sort((a, b) => b.totalAttestations - a.totalAttestations);
            const isExpanded = expandedCategories.has(cat);

            return (
              <div key={cat} className="bg-white rounded-2xl border border-border overflow-hidden">
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-primary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
                      {cat.replace(/_/g, ' ')}
                    </h2>
                    <span className="text-xs text-text-muted bg-bg-secondary px-2 py-0.5 rounded-full">
                      {catSkills.length} skill{catSkills.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Skill rows */}
                {isExpanded && (
                  <div className="border-t border-border">
                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-2 px-5 py-2 text-[10px] font-medium text-text-muted uppercase tracking-wider bg-bg-primary">
                      <div className="col-span-4">Skill</div>
                      <div className="col-span-2 text-center">Members</div>
                      <div className="col-span-3 text-center">Attestations</div>
                      <div className="col-span-3">Top Member</div>
                    </div>
                    {catSkills.map((skill) => (
                      <div
                        key={skill.name}
                        className="grid grid-cols-12 gap-2 items-center px-5 py-3 border-t border-border-light"
                      >
                        <div className="col-span-4">
                          <SkillBadge name={skill.name} category={skill.category} size="sm" />
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-semibold text-text-primary">{skill.memberCount}</span>
                        </div>
                        <div className="col-span-3 text-center">
                          <span className="text-sm font-semibold text-text-primary">{skill.totalAttestations}</span>
                        </div>
                        <div className="col-span-3">
                          <span className="text-xs text-text-secondary truncate block">{skill.topMember || '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-agent/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-agent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No skills recorded yet</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto">
            Squad members earn skill attestations by completing deliverables on contracts.
            As the squad takes on projects, this matrix will show the collective capabilities.
          </p>
        </div>
      )}
    </div>
  );
}
