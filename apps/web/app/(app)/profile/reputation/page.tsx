'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AttestationBadge } from '@/components/attestation-badge';
import { TrustScoreRing } from '@/components/trust-score-ring';
import { SkillBadge } from '@/components/skill-badge';

interface Attestation {
  id: string;
  type: string;
  easUid: string | null;
  schemaUid: string | null;
  onChain: boolean;
  data: Record<string, unknown>;
  createdAt: string;
}

interface TrustScoreData {
  trustScore: number;
  breakdown: {
    base: number;
    bio: number;
    squads: number;
    squadContracts: number;
    clientContracts: number;
    attestations: number;
    [key: string]: number;
  };
  details: {
    hasBio: boolean;
    squadMemberships?: number;
    completedAsSquadMember?: number;
    completedAsClient?: number;
    attestationCount?: number;
    attestationsByType?: Record<string, number>;
    [key: string]: unknown;
  };
}

interface UserSkill {
  id: string;
  skillName: string;
  skillSlug: string;
  category: string;
  proficiencyLevel: 'demonstrated' | 'proficient' | 'expert';
  attestationCount: number;
}

const TRUST_THRESHOLDS = [
  { label: 'Open', min: 0 },
  { label: 'Verified', min: 25 },
  { label: 'Trusted', min: 50 },
  { label: 'Premium', min: 75 },
];

const ATTESTATION_TYPE_LABELS: Record<string, string> = {
  contract_completion: 'Contract Completion',
  client_satisfaction: 'Client Satisfaction',
  agent_capability: 'Agent Capability',
  skill_verification: 'Skill Verification',
};

export default function TrustReputationPage() {
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [web3Enabled, setWeb3Enabled] = useState(false);
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [topSkills, setTopSkills] = useState<UserSkill[]>([]);

  // Check if wallet is connected (web3 enabled)
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).ethereum) {
      setWeb3Enabled(true);
    }
  }, []);

  useEffect(() => {
    fetch('/api/users/me/trust-score')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('/api/users/me/attestations')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setAttestations(data);
      })
      .catch(() => {});
  }, []);

  // Fetch user skills (top 5 for this page)
  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((session) => {
        const userId = session?.user?.id;
        if (!userId) return;
        return fetch(`/api/users/${userId}/skills`);
      })
      .then((r) => r?.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Sort by attestation count desc, take top 5
          const sorted = data.sort((a: UserSkill, b: UserSkill) => b.attestationCount - a.attestationCount);
          setTopSkills(sorted.slice(0, 5));
        }
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const score = data?.trustScore ?? 0;

  const breakdownItems = data
    ? [
        { label: 'Base score', value: data.breakdown.base, description: 'Every member starts here' },
        { label: 'Bio completed', value: data.breakdown.bio, description: data.details.hasBio ? 'Bio is set' : 'Add a bio to earn +10' },
        { label: 'Squad memberships', value: data.breakdown.squads ?? 0, description: `${data.details.squadMemberships ?? 0} squad(s), +5 each (max +20)` },
        { label: 'Contracts as squad member', value: data.breakdown.squadContracts ?? 0, description: `${data.details.completedAsSquadMember ?? 0} completed, +10 each` },
        { label: 'Contracts as client', value: data.breakdown.clientContracts ?? 0, description: `${data.details.completedAsClient ?? 0} completed, +5 each` },
        { label: 'Attestations', value: data.breakdown.attestations ?? 0, description: `${data.details.attestationCount ?? 0} attestation(s), weighted by type (max +30)` },
      ]
    : [];

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Trust &amp; Reputation</h1>
        <p className="text-text-secondary mt-1">Your trust score reflects your activity and reliability on SquadSwarm.</p>
      </div>

      {/* Trust score circle */}
      <div className="bg-white rounded-xl border border-border p-8 mb-6">
        <div className="flex flex-col items-center">
          <TrustScoreRing score={score} size="lg" colorByThreshold />
          <p className="text-sm text-text-secondary mt-4">
            {score >= 80
              ? 'Excellent reputation'
              : score >= 60
                ? 'Good reputation'
                : score >= 40
                  ? 'Building reputation'
                  : 'Getting started'}
          </p>
          {/* Threshold eligibility */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {TRUST_THRESHOLDS.map((t) => {
              const qualified = score >= t.min;
              const gap = t.min - score;
              return (
                <span
                  key={t.label}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    qualified
                      ? 'bg-success/10 text-success'
                      : 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {t.label} {qualified ? '\u2713' : `(${gap} pts away)`}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Score breakdown */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-4">Score Breakdown</h2>
        <div className="space-y-3">
          {breakdownItems.map((item) => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div>
                <p className="text-sm font-medium text-text-primary">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.description}</p>
              </div>
              <span
                className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                  item.value > 0 ? 'bg-success/10 text-success' : 'bg-bg-secondary text-text-secondary'
                }`}
              >
                +{item.value}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-semibold text-text-primary">Total (capped at 100)</p>
            <span className="text-sm font-bold text-accent-squad">{score}</span>
          </div>
        </div>
      </div>

      {/* How trust scores work */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <h2 className="font-semibold text-text-primary mb-3">How Trust Scores Work</h2>
        <div className="space-y-2 text-sm text-text-secondary">
          <p>
            Your trust score is a measure of your participation and reliability on SquadSwarm.
            It is recalculated each time you visit your profile or reputation page.
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>Everyone starts with a <span className="font-medium text-text-primary">base score of 50</span></li>
            <li>Completing your bio adds <span className="font-medium text-text-primary">+10</span></li>
            <li>Each squad membership adds <span className="font-medium text-text-primary">+5</span> (up to +20)</li>
            <li>Each completed contract as a squad member adds <span className="font-medium text-text-primary">+10</span></li>
            <li>Each completed contract as a client adds <span className="font-medium text-text-primary">+5</span></li>
            <li>On-chain attestations add up to <span className="font-medium text-text-primary">+30</span>, weighted by type</li>
            <li>The maximum score is <span className="font-medium text-text-primary">100</span></li>
          </ul>
          <p>
            Higher trust scores unlock priority matching and signal dependability to clients and squads.
          </p>
        </div>
      </div>

      {/* Activity summary */}
      {data && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="font-semibold text-text-primary mb-4">Activity Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-bg-primary rounded-lg border border-border">
              <p className="text-2xl font-bold text-text-primary">{data.details.squadMemberships ?? 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Squads Joined</p>
            </div>
            <div className="text-center p-3 bg-bg-primary rounded-lg border border-border">
              <p className="text-2xl font-bold text-text-primary">{data.details.completedAsSquadMember ?? 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Contracts (Squad)</p>
            </div>
            <div className="text-center p-3 bg-bg-primary rounded-lg border border-border">
              <p className="text-2xl font-bold text-text-primary">{data.details.completedAsClient ?? 0}</p>
              <p className="text-xs text-text-secondary mt-0.5">Contracts (Client)</p>
            </div>
          </div>
        </div>
      )}

      {/* Skills section */}
      <div className="bg-white rounded-xl border border-border p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary">Skills</h2>
          <Link
            href="/profile/skills"
            className="text-xs text-accent-agent hover:text-accent-agent-hover font-medium"
          >
            View all skills &rarr;
          </Link>
        </div>
        {topSkills.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {topSkills.map((skill) => (
              <SkillBadge
                key={skill.id}
                name={skill.skillName}
                category={skill.category}
                proficiencyLevel={skill.proficiencyLevel}
                attestationCount={skill.attestationCount}
                size="md"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-secondary">
              No skills earned yet. Complete contract deliverables to build your skill portfolio.
            </p>
            <Link
              href="/profile/skills"
              className="inline-block mt-2 text-sm text-accent-agent hover:text-accent-agent-hover font-medium"
            >
              Learn how it works &rarr;
            </Link>
          </div>
        )}
      </div>

      {/* On-Chain Attestations */}
      <div className="bg-white rounded-xl border border-border p-6 mt-6">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
          <h2 className="font-semibold text-text-primary">On-Chain Attestations</h2>
          {attestations.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
              {attestations.length}
            </span>
          )}
        </div>

        {attestations.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary mb-4">
              Your verified attestations via Ethereum Attestation Service (EAS) on Base.
            </p>
            <div className="flex flex-wrap gap-2">
              {attestations.map((att) => (
                att.onChain && att.easUid ? (
                  <AttestationBadge
                    key={att.id}
                    uid={att.easUid}
                    schemaName={ATTESTATION_TYPE_LABELS[att.type] ?? att.type}
                    timestamp={Math.floor(new Date(att.createdAt).getTime() / 1000)}
                    size="md"
                  />
                ) : (
                  <span
                    key={att.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-bg-secondary text-text-secondary"
                    title="Off-chain attestation"
                  >
                    {ATTESTATION_TYPE_LABELS[att.type] ?? att.type}
                    <span className="text-text-secondary/60">
                      {new Date(att.createdAt).toLocaleDateString()}
                    </span>
                  </span>
                )
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-3">
              Attestations are created automatically when contracts are completed and verified on-chain.
            </p>
          </div>
        ) : web3Enabled ? (
          <div className="text-center py-6">
            <p className="text-sm text-text-secondary">
              No attestations yet. Complete contracts to earn on-chain reputation.
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-accent-agent/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-accent-agent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="12" rx="2" />
                <path d="M22 10H2" />
                <path d="M7 15h4" />
              </svg>
            </div>
            <h3 className="font-medium text-text-primary mb-1">Connect Wallet to Earn Attestations</h3>
            <p className="text-sm text-text-secondary max-w-sm mx-auto">
              Link your wallet to receive on-chain attestations for completed contracts,
              verified skills, and client satisfaction ratings via EAS on Base.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
