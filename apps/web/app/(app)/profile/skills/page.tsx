'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrustScoreRing } from '@/components/trust-score-ring';
import { SkillBadge } from '@/components/skill-badge';

interface UserSkill {
  id: string;
  skillId: string;
  skillName: string;
  skillSlug: string;
  category: string;
  proficiencyLevel: 'demonstrated' | 'proficient' | 'expert';
  attestationCount: number;
  lastAttestedAt: string | null;
}

interface TrustScoreData {
  trustScore: number;
  breakdown: Record<string, number>;
  details: Record<string, unknown>;
}

export default function SkillPortfolioPage() {
  const [skills, setSkills] = useState<UserSkill[]>([]);
  const [trustData, setTrustData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch trust score (which also gives us the userId context)
        const trustRes = await fetch('/api/users/me/trust-score');
        if (!trustRes.ok) throw new Error('Failed to load trust score');
        const trustJson = await trustRes.json();
        if (!cancelled) setTrustData(trustJson);

        // Fetch user's session to get userId
        const sessionRes = await fetch('/api/auth/session');
        const sessionJson = await sessionRes.json();
        const userId = sessionJson?.user?.id;

        if (userId) {
          const skillsRes = await fetch(`/api/users/${userId}/skills`);
          if (skillsRes.ok) {
            const skillsJson = await skillsRes.json();
            if (!cancelled && Array.isArray(skillsJson)) {
              setSkills(skillsJson);
            }
          }
          // If skills endpoint doesn't exist yet, we just show empty state
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const score = trustData?.trustScore ?? 0;
  const categories = [...new Set(skills.map((s) => s.category))];
  const totalAttestations = skills.reduce((sum, s) => sum + s.attestationCount, 0);

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">My Skills</h1>
            <p className="text-text-secondary mt-1">
              {skills.length > 0
                ? `${skills.length} skill${skills.length !== 1 ? 's' : ''} across ${categories.length} categor${categories.length !== 1 ? 'ies' : 'y'}, ${totalAttestations} total attestation${totalAttestations !== 1 ? 's' : ''}`
                : 'Your skill portfolio grows as you complete deliverables'}
            </p>
          </div>
          <TrustScoreRing
            score={score}
            size="lg"
            showLabel
            label="Trust Score"
            colorByThreshold
          />
        </div>
      </div>

      {/* Trust threshold eligibility */}
      <div className="bg-white rounded-2xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-primary mb-3">Bid Eligibility</h2>
        <div className="flex flex-wrap gap-3">
          <ThresholdPill label="Open" threshold={0} current={score} />
          <ThresholdPill label="Verified" threshold={25} current={score} />
          <ThresholdPill label="Trusted" threshold={50} current={score} />
          <ThresholdPill label="Premium" threshold={75} current={score} />
        </div>
      </div>

      {/* Skill grid */}
      {skills.length > 0 ? (
        <div className="space-y-6">
          {categories.sort().map((cat) => {
            const catSkills = skills.filter((s) => s.category === cat);
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
                  {cat.replace(/_/g, ' ')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {catSkills.map((skill) => (
                    <Link
                      key={skill.id}
                      href={`/skills/${skill.skillSlug}`}
                      className="block hover:shadow-sm transition-shadow"
                    >
                      <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-sm text-text-primary">{skill.skillName}</h3>
                          <ProficiencyIndicator level={skill.proficiencyLevel} />
                        </div>
                        <div className="flex items-center justify-between text-xs text-text-secondary">
                          <span>{skill.attestationCount} attestation{skill.attestationCount !== 1 ? 's' : ''}</span>
                          {skill.lastAttestedAt && (
                            <span>{new Date(skill.lastAttestedAt).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty state */
        <div className="bg-white rounded-2xl border border-border p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent-squad/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-accent-squad" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">No skills yet</h2>
          <p className="text-sm text-text-secondary max-w-md mx-auto mb-6">
            Complete deliverables on contracts to earn skill attestations. Each completed deliverable
            automatically records the skills you demonstrated, building your verifiable portfolio.
          </p>
          <div className="max-w-sm mx-auto space-y-3 text-left">
            <HowItWorksStep
              number={1}
              title="Claim deliverables"
              description="Join a squad and claim deliverables on active bids that match your abilities."
            />
            <HowItWorksStep
              number={2}
              title="Complete the work"
              description="Deliver quality work and get it accepted by the client."
            />
            <HowItWorksStep
              number={3}
              title="Earn attestations"
              description="Skills are automatically attested when deliverables are marked complete."
            />
          </div>
        </div>
      )}

      {/* Back link */}
      <div className="mt-8">
        <Link
          href="/profile/reputation"
          className="text-sm text-accent-agent hover:text-accent-agent-hover font-medium"
        >
          &larr; Back to Trust &amp; Reputation
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThresholdPill({ label, threshold, current }: { label: string; threshold: number; current: number }) {
  const qualified = current >= threshold;
  const gap = threshold - current;
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border ${
        qualified
          ? 'bg-success/10 border-success/20 text-success'
          : 'bg-bg-secondary border-border text-text-secondary'
      }`}
    >
      {qualified ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m0 0v2m0-2h2m-2 0H10" />
        </svg>
      )}
      <span className="font-medium">{label}</span>
      {!qualified && <span className="text-xs">({gap} pts away)</span>}
    </div>
  );
}

function ProficiencyIndicator({ level }: { level: string }) {
  const filled = level === 'expert' ? 3 : level === 'proficient' ? 2 : 1;
  return (
    <div className="flex items-center gap-1" title={level}>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${
            i <= filled ? 'bg-accent-squad' : 'bg-border-light'
          }`}
        />
      ))}
    </div>
  );
}

function HowItWorksStep({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3">
      <div className="w-6 h-6 rounded-full bg-accent-squad text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="text-xs text-text-secondary">{description}</p>
      </div>
    </div>
  );
}
