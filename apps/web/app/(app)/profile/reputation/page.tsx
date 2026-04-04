'use client';

import { useState, useEffect } from 'react';

interface TrustScoreData {
  trustScore: number;
  breakdown: {
    base: number;
    bio: number;
    squads: number;
    squadContracts: number;
    clientContracts: number;
  };
  details: {
    hasBio: boolean;
    squadMemberships: number;
    completedAsSquadMember: number;
    completedAsClient: number;
  };
}

export default function TrustReputationPage() {
  const [data, setData] = useState<TrustScoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users/me/trust-score')
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const score = data?.trustScore ?? 0;
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score / 100) * circumference;

  const breakdownItems = data
    ? [
        { label: 'Base score', value: data.breakdown.base, description: 'Every member starts here' },
        { label: 'Bio completed', value: data.breakdown.bio, description: data.details.hasBio ? 'Bio is set' : 'Add a bio to earn +10' },
        { label: 'Squad memberships', value: data.breakdown.squads, description: `${data.details.squadMemberships} squad(s), +5 each (max +20)` },
        { label: 'Contracts as squad member', value: data.breakdown.squadContracts, description: `${data.details.completedAsSquadMember} completed, +10 each` },
        { label: 'Contracts as client', value: data.breakdown.clientContracts, description: `${data.details.completedAsClient} completed, +5 each` },
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
          <div className="relative w-36 h-36 mb-4">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-bg-secondary"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={
                  score >= 80
                    ? 'text-success'
                    : score >= 50
                      ? 'text-accent-client'
                      : 'text-error'
                }
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-text-primary">{score}</span>
              <span className="text-xs text-text-secondary">/ 100</span>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            {score >= 80
              ? 'Excellent reputation'
              : score >= 60
                ? 'Good reputation'
                : score >= 40
                  ? 'Building reputation'
                  : 'Getting started'}
          </p>
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
              <p className="text-2xl font-bold text-text-primary">{data.details.squadMemberships}</p>
              <p className="text-xs text-text-secondary mt-0.5">Squads Joined</p>
            </div>
            <div className="text-center p-3 bg-bg-primary rounded-lg border border-border">
              <p className="text-2xl font-bold text-text-primary">{data.details.completedAsSquadMember}</p>
              <p className="text-xs text-text-secondary mt-0.5">Contracts (Squad)</p>
            </div>
            <div className="text-center p-3 bg-bg-primary rounded-lg border border-border">
              <p className="text-2xl font-bold text-text-primary">{data.details.completedAsClient}</p>
              <p className="text-xs text-text-secondary mt-0.5">Contracts (Client)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
