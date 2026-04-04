'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Member {
  userId: string;
  displayName: string;
  email: string;
  role: string;
}

interface Agent {
  id: string;
  name: string;
  provider: string;
  model: string;
  capabilities: string[] | null;
  status: string;
}

interface SquadDetail {
  id: string;
  name: string;
  bio: string | null;
  missionStatement: string | null;
  governanceModel: { model: string } | null;
  trustScore: string;
  members: Member[];
  agents: Agent[];
}

export default function SquadProfilePage() {
  const params = useParams();
  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/squads/${params.squadId}`)
      .then((res) => res.json())
      .then((data) => { if (!data.error) setSquad(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.squadId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="max-w-4xl">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load squad</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const governance = squad.governanceModel as { model: string } | null;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-accent-squad/10 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-accent-squad font-bold text-2xl">
              {squad.name.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">{squad.name}</h1>
            {squad.bio && <p className="text-text-secondary mt-1">{squad.bio}</p>}
            {squad.missionStatement && (
              <p className="text-sm text-text-secondary mt-2 italic">
                "{squad.missionStatement}"
              </p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm">
              <span className="text-text-secondary">
                Trust Score:{' '}
                <span className="font-semibold text-text-primary">
                  {parseFloat(squad.trustScore).toFixed(0)}
                </span>
              </span>
              {governance && (
                <span className="px-2 py-0.5 bg-bg-secondary rounded text-xs capitalize">
                  {governance.model} governance
                </span>
              )}
              <span className="text-text-secondary">
                {squad.members.length} members
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Members */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Members</h2>
            <button className="text-sm text-accent-squad hover:underline">Invite</button>
          </div>
          <div className="space-y-3">
            {squad.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-bg-secondary rounded-full flex items-center justify-center shrink-0">
                  <span className="text-sm font-medium">
                    {m.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.displayName}</div>
                  <div className="text-xs text-text-secondary">{m.email}</div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    m.role === 'admin'
                      ? 'bg-accent-squad/10 text-accent-squad'
                      : 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {m.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Agents */}
        <div className="bg-white rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Agents (Swarm)</h2>
            <Link
              href={`/squads/${squad.id}/agents`}
              className="text-sm text-accent-agent hover:underline"
            >
              Manage
            </Link>
          </div>
          <div className="space-y-3">
            {squad.agents.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <div className="w-9 h-9 bg-accent-agent/10 rounded-lg flex items-center justify-center shrink-0 rotate-45 border border-accent-agent/20">
                  <span className="text-accent-agent text-xs font-bold -rotate-45">
                    {a.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.name}</div>
                  <div className="text-xs text-text-secondary">
                    {a.provider} / {a.model}
                  </div>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {(a.capabilities || []).slice(0, 3).map((c) => (
                    <span
                      key={c}
                      className="text-[10px] px-1.5 py-0.5 bg-accent-agent/10 text-accent-agent rounded"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {squad.agents.length === 0 && (
              <p className="text-text-secondary text-sm text-center py-4">
                No agents registered yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
