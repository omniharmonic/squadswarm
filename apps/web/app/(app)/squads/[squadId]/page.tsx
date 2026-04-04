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
  multisigAddress: string | null;
  paymentMode: string;
  members: Member[];
  agents: Agent[];
}

function isValidEthAddress(addr: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(addr);
}

export default function SquadProfilePage() {
  const params = useParams();
  const [squad, setSquad] = useState<SquadDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Multisig address editing
  const [editingAddress, setEditingAddress] = useState(false);
  const [addressInput, setAddressInput] = useState('');
  const [addressError, setAddressError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  // Check if the current user is an admin
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    async function fetchSquad() {
      try {
        const res = await fetch(`/api/squads/${params.squadId}`);
        const data = await res.json();
        if (!data.error) {
          setSquad(data);
          // Check if current user is admin via members
          const membersRes = await fetch(`/api/squads/${params.squadId}/members`);
          if (membersRes.ok) {
            const members = await membersRes.json();
            // We get the current user from auth context, but for simplicity
            // we check if any admin member exists and match by session
            // The squad detail page already renders members, so we set this from members data
            setSquad((prev) => prev ? {
              ...prev,
              members: members.map((m: { userId: string; userName: string; userEmail: string; role: string }) => ({
                userId: m.userId,
                displayName: m.userName,
                email: m.userEmail,
                role: m.role,
              })),
            } : prev);
            // Check admin status via a lightweight approach: try PATCH with empty body
            // Actually, we'll use a simpler signal: fetch /api/auth/me and compare
            const authRes = await fetch('/api/auth/me');
            if (authRes.ok) {
              const authData = await authRes.json();
              const currentMember = members.find((m: { userId: string }) => m.userId === authData.userId);
              setIsAdmin(currentMember?.role === 'admin');
            }
          }
        }
      } catch {
        // leave squad as null
      } finally {
        setLoading(false);
      }
    }
    fetchSquad();
  }, [params.squadId]);

  async function handleSaveAddress() {
    const trimmed = addressInput.trim();
    if (trimmed && !isValidEthAddress(trimmed)) {
      setAddressError('Invalid address. Must start with 0x and be 42 characters.');
      return;
    }
    setSavingAddress(true);
    setAddressError('');
    try {
      const res = await fetch(`/api/squads/${params.squadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ multisigAddress: trimmed || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSquad((prev) => prev ? { ...prev, multisigAddress: updated.multisigAddress } : prev);
        setEditingAddress(false);
      } else {
        const err = await res.json();
        setAddressError(err.error || 'Failed to save');
      }
    } catch {
      setAddressError('Network error');
    } finally {
      setSavingAddress(false);
    }
  }

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
                &ldquo;{squad.missionStatement}&rdquo;
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

      {/* Payment Address */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Payment Address</h2>
          {isAdmin && !editingAddress && (
            <button
              onClick={() => {
                setAddressInput(squad.multisigAddress || '');
                setEditingAddress(true);
                setAddressError('');
              }}
              className="text-sm text-accent-squad hover:underline"
            >
              Edit
            </button>
          )}
        </div>

        {editingAddress ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-text-secondary block mb-1">Multisig Wallet Address (Ethereum)</label>
              <input
                type="text"
                value={addressInput}
                onChange={(e) => { setAddressInput(e.target.value); setAddressError(''); }}
                placeholder="0x..."
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/40"
              />
              {addressError && <p className="text-sm text-error mt-1">{addressError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setEditingAddress(false); setAddressError(''); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddress}
                disabled={savingAddress}
                className="px-4 py-2 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {savingAddress ? 'Saving...' : 'Save Address'}
              </button>
            </div>
          </div>
        ) : squad.multisigAddress ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-escrow/10 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-escrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-text-primary truncate">{squad.multisigAddress}</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {squad.paymentMode === 'crypto' ? 'USDC on Base' : 'Multisig wallet'}{' '}
                <a
                  href={`https://basescan.org/address/${squad.multisigAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-agent hover:underline"
                >
                  View on Basescan
                </a>
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            No payment address configured.
            {isAdmin && ' Click Edit to add a multisig wallet address.'}
          </p>
        )}
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
