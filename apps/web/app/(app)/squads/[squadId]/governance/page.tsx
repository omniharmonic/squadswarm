'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface GovernanceModel {
  type: string;
  threshold?: number;
  delegateTo?: string;
}

interface SquadData {
  id: string;
  name: string;
  governanceModel: GovernanceModel;
}

const GOVERNANCE_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  consent: {
    title: 'Consent-Based',
    description:
      'Decisions proceed unless a member raises a reasoned objection. Emphasizes "good enough for now, safe enough to try." Efficient for squads with high trust.',
  },
  majority: {
    title: 'Majority Vote',
    description:
      'Decisions require more than 50% of active members to vote in favor. Clear and democratic, best for larger squads where full consensus is impractical.',
  },
  delegated: {
    title: 'Delegated Authority',
    description:
      'Specific members are delegated authority for certain decision types. Fast execution with accountability. Best for squads that need rapid response.',
  },
};

const PERMISSION_MATRIX = [
  { action: 'Submit Bid', consent: 'Consent required', majority: 'Majority vote', delegated: 'Lead only' },
  { action: 'Accept Contract', consent: 'Consent required', majority: 'Majority vote', delegated: 'Lead + finance' },
  { action: 'Manage Members', consent: 'Consent required', majority: 'Majority vote', delegated: 'Admin only' },
  { action: 'Manage Agents', consent: 'No objection (48h)', majority: 'Simple majority', delegated: 'Tech lead' },
  { action: 'Change Governance', consent: 'Full consensus', majority: 'Supermajority (67%)', delegated: 'Full vote required' },
  { action: 'Financial Decisions', consent: 'Consent required', majority: 'Majority vote', delegated: 'Finance delegate' },
];

export default function GovernanceSettingsPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [squad, setSquad] = useState<SquadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedModel, setSelectedModel] = useState('consent');

  useEffect(() => {
    async function fetchSquad() {
      try {
        const res = await fetch(`/api/squads/${squadId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setSquad(data);
        const model = data.governanceModel as GovernanceModel;
        setSelectedModel(model?.type || 'consent');
      } catch {
        // Leave squad as null on failure
      } finally {
        setLoading(false);
      }
    }
    fetchSquad();
  }, [squadId]);

  async function handleSave() {
    try {
      await fetch(`/api/squads/${squadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ governanceModel: { type: selectedModel } }),
      });
      setSquad((prev) => prev ? { ...prev, governanceModel: { type: selectedModel } } : prev);
    } catch {
      // silently fail
    }
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse" />
        <div className="bg-white rounded-xl border border-border p-8 space-y-4">
          <div className="h-5 w-48 bg-bg-secondary rounded animate-pulse" />
          <div className="h-4 w-full bg-bg-secondary rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load governance settings</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const model = squad.governanceModel as GovernanceModel;
  const currentType = model?.type || 'consent';
  const govInfoKey = currentType in GOVERNANCE_DESCRIPTIONS ? currentType : 'consent';
  const govInfo = GOVERNANCE_DESCRIPTIONS[govInfoKey]!;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Governance Settings</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/squads/${squadId}`} className="hover:text-accent-squad transition-colors">
            {squad.name}
          </Link>{' '}
          &mdash; Configure voting rules and decision processes
        </p>
      </div>

      {/* Current Model */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Current Model</h2>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-text-secondary hover:bg-bg-secondary transition-colors"
            >
              Edit Governance
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4">
            {Object.entries(GOVERNANCE_DESCRIPTIONS).map(([key, info]) => (
              <label
                key={key}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                  selectedModel === key
                    ? 'border-accent-squad bg-accent-squad/5'
                    : 'border-border hover:bg-bg-primary'
                }`}
              >
                <input
                  type="radio"
                  name="governance"
                  value={key}
                  checked={selectedModel === key}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="mt-1 accent-accent-squad"
                />
                <div>
                  <p className="font-medium text-text-primary">{info.title}</p>
                  <p className="text-sm text-text-secondary mt-0.5">{info.description}</p>
                </div>
              </label>
            ))}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad/90 transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={() => { setEditing(false); setSelectedModel(currentType); }}
                className="px-5 py-2.5 border border-border text-text-primary rounded-xl text-sm font-medium hover:bg-bg-secondary transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-1">{govInfo.title}</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{govInfo.description}</p>
          </div>
        )}
      </section>

      {/* Permissions Matrix */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Action Permissions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-text-primary">Action</th>
                <th className={`text-left py-2 px-4 font-medium ${currentType === 'consent' ? 'text-accent-squad' : 'text-text-secondary'}`}>
                  Consent
                </th>
                <th className={`text-left py-2 px-4 font-medium ${currentType === 'majority' ? 'text-accent-squad' : 'text-text-secondary'}`}>
                  Majority
                </th>
                <th className={`text-left py-2 px-4 font-medium ${currentType === 'delegated' ? 'text-accent-squad' : 'text-text-secondary'}`}>
                  Delegated
                </th>
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.action} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-text-primary">{row.action}</td>
                  <td className={`py-3 px-4 ${currentType === 'consent' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {row.consent}
                  </td>
                  <td className={`py-3 px-4 ${currentType === 'majority' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {row.majority}
                  </td>
                  <td className={`py-3 px-4 ${currentType === 'delegated' ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {row.delegated}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Decisions */}
      <section className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Recent Governance Decisions
        </h2>
        <p className="text-text-secondary text-sm text-center py-4">No governance decisions yet.</p>
      </section>
    </div>
  );
}
