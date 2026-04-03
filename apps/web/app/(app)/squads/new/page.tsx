'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const GOVERNANCE_OPTIONS = [
  {
    value: 'consent',
    label: 'Consent',
    description: 'All members must agree. Any member can block. Best for high-trust squads.',
  },
  {
    value: 'majority',
    label: 'Majority',
    description: 'Decisions pass with 51%+ approval. Efficient for larger squads.',
  },
  {
    value: 'delegated',
    label: 'Delegated',
    description: 'Designated members make decisions. Fastest for specialized teams.',
  },
];

const SPLIT_OPTIONS = [
  { value: 'equal', label: 'Equal', description: 'Revenue split equally among all members' },
  {
    value: 'role_weighted',
    label: 'Role-weighted',
    description: 'Revenue split based on role assignments',
  },
  { value: 'custom', label: 'Custom', description: 'Set custom percentages per member' },
];

export default function CreateSquadPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [missionStatement, setMissionStatement] = useState('');
  const [governanceModel, setGovernanceModel] = useState('consent');
  const [revenueSplit, setRevenueSplit] = useState('equal');
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setStatus('loading');
    setError('');

    try {
      const res = await fetch('/api/squads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          bio,
          missionStatement,
          governanceModel: { model: governanceModel },
          revenueSplitDefault: { type: revenueSplit },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create squad');
      }

      const squad = await res.json();
      router.push(`/squads/${squad.id}`);
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Create a Squad</h1>
        <p className="text-text-secondary mt-1">
          Form your cooperative team. You'll be the founding admin.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-xl border border-border p-6 space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1.5">
              Squad name <span className="text-error">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Regen Builders"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                         focus:outline-none focus:ring-2 focus:ring-accent-squad/50 focus:border-accent-squad text-sm"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-1.5">
              Bio
            </label>
            <textarea
              id="bio"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A short description of your squad..."
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                         focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y"
            />
          </div>

          <div>
            <label htmlFor="mission" className="block text-sm font-medium mb-1.5">
              Mission statement
            </label>
            <textarea
              id="mission"
              rows={2}
              value={missionStatement}
              onChange={(e) => setMissionStatement(e.target.value)}
              placeholder="What drives your squad?"
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-bg-primary
                         focus:outline-none focus:ring-2 focus:ring-accent-squad/50 text-sm resize-y"
            />
          </div>
        </div>

        {/* Governance Model */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Governance Model</h2>
          <div className="space-y-3">
            {GOVERNANCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  governanceModel === opt.value
                    ? 'border-accent-squad bg-accent-squad/5'
                    : 'border-border hover:border-accent-squad/30'
                }`}
              >
                <input
                  type="radio"
                  name="governance"
                  value={opt.value}
                  checked={governanceModel === opt.value}
                  onChange={(e) => setGovernanceModel(e.target.value)}
                  className="mt-0.5 accent-accent-squad"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-text-secondary text-xs mt-0.5">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Revenue Split */}
        <div className="bg-white rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold mb-4">Default Revenue Split</h2>
          <div className="space-y-3">
            {SPLIT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  revenueSplit === opt.value
                    ? 'border-accent-squad bg-accent-squad/5'
                    : 'border-border hover:border-accent-squad/30'
                }`}
              >
                <input
                  type="radio"
                  name="split"
                  value={opt.value}
                  checked={revenueSplit === opt.value}
                  onChange={(e) => setRevenueSplit(e.target.value)}
                  className="mt-0.5 accent-accent-squad"
                />
                <div>
                  <div className="font-medium text-sm">{opt.label}</div>
                  <div className="text-text-secondary text-xs mt-0.5">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-error">{error}</p>}

        <button
          type="submit"
          disabled={!name.trim() || status === 'loading'}
          className="w-full py-3 bg-accent-squad text-white rounded-lg font-medium
                     hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === 'loading' ? 'Creating...' : 'Create Squad'}
        </button>
      </form>
    </div>
  );
}
