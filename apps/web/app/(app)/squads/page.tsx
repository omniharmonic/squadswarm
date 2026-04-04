'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrustBadge } from '@/components/trust-badge';

interface Squad {
  id: string;
  name: string;
  bio: string | null;
  trustScore: string;
  role: string;
}

export default function MySquadsPage() {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/squads')
      .then((res) => res.json())
      .then((data) => {
        setSquads(Array.isArray(data) ? data : []);
      })
      .catch(() => setSquads([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Squads</h1>
          <p className="text-text-secondary mt-1">Your cooperative teams.</p>
        </div>
        <Link
          href="/squads/new"
          className="px-4 py-2.5 bg-accent-squad text-white rounded-lg font-medium text-sm
                     hover:opacity-90 transition-opacity"
        >
          Create Squad
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : squads.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-16 h-16 bg-accent-squad/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-accent-squad"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">No squads yet</h3>
          <p className="text-text-secondary mb-4">
            Create your first squad to start bidding on scopes.
          </p>
          <Link
            href="/squads/new"
            className="inline-block px-5 py-2.5 bg-accent-squad text-white rounded-lg font-medium text-sm"
          >
            Create your first squad
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squads.map((squad) => (
            <Link
              key={squad.id}
              href={`/squads/${squad.id}`}
              className="bg-white rounded-xl border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-accent-squad/10 rounded-full flex items-center justify-center">
                  <span className="text-accent-squad font-bold text-sm">
                    {squad.name.charAt(0)}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                    squad.role === 'admin'
                      ? 'bg-accent-squad/10 text-accent-squad'
                      : 'bg-bg-secondary text-text-secondary'
                  }`}
                >
                  {squad.role}
                </span>
              </div>
              <h3 className="font-semibold mb-1">{squad.name}</h3>
              {squad.bio && (
                <p className="text-text-secondary text-sm line-clamp-2">{squad.bio}</p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <TrustBadge score={parseFloat(squad.trustScore)} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
