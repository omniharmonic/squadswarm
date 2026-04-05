'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SquadData {
  id: string;
  name: string;
  revenueSplitDefault: Record<string, number> | null;
  multisigAddress: string | null;
}

interface ContractRecord {
  id: string;
  title: string;
  totalAmount: string;
  status: string;
  completedAt: string | null;
  createdAt: string;
  clientName: string;
  squadName: string;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

export default function FinancialDashboardPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [squad, setSquad] = useState<SquadData | null>(null);
  const [contracts, setContracts] = useState<ContractRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Treasury split config state
  const [treasuryPct, setTreasuryPct] = useState(20);
  const [savingSplit, setSavingSplit] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [squadRes, contractsRes] = await Promise.all([
          fetch(`/api/squads/${squadId}`),
          fetch('/api/contracts'),
        ]);

        if (squadRes.ok) {
          const squadData = await squadRes.json();
          setSquad(squadData);
          // Initialize treasury pct from existing split config
          const split = squadData.revenueSplitDefault as Record<string, number> | null;
          if (split?.treasury !== undefined) {
            setTreasuryPct(split.treasury);
          }
        }

        if (contractsRes.ok) {
          const allContracts: ContractRecord[] = await contractsRes.json();
          const squadContracts = allContracts.filter((c) => {
            return (c as ContractRecord & { squadId?: string }).squadId === squadId;
          });
          setContracts(squadContracts);
        }
      } catch {
        // Leave state as defaults on failure
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [squadId]);

  async function handleSaveTreasurySplit() {
    setSavingSplit(true);
    try {
      const currentSplit = (squad?.revenueSplitDefault || { lead: 30, members: 50, treasury: 20 }) as Record<string, number>;
      // Recalculate: treasury gets the slider value, the rest is distributed proportionally among non-treasury keys
      const nonTreasuryTotal = 100 - treasuryPct;
      const oldNonTreasuryTotal = Object.entries(currentSplit)
        .filter(([k]) => k !== 'treasury')
        .reduce((sum, [, v]) => sum + v, 0);

      const newSplit: Record<string, number> = { treasury: treasuryPct };
      for (const [key, value] of Object.entries(currentSplit)) {
        if (key !== 'treasury') {
          newSplit[key] = oldNonTreasuryTotal > 0
            ? Math.round((value / oldNonTreasuryTotal) * nonTreasuryTotal)
            : Math.round(nonTreasuryTotal / (Object.keys(currentSplit).length - 1));
        }
      }

      const res = await fetch(`/api/squads/${squadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revenueSplitDefault: newSplit }),
      });
      if (res.ok) {
        setSquad((prev) => prev ? { ...prev, revenueSplitDefault: newSplit } : prev);
      }
    } catch {
      // silently fail
    } finally {
      setSavingSplit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-6">
              <div className="h-4 w-20 bg-bg-secondary rounded animate-pulse mb-2" />
              <div className="h-8 w-28 bg-bg-secondary rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!squad) {
    return (
      <div className="max-w-3xl">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load financial data</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const completedContracts = contracts.filter((c) => c.status === 'completed');
  const totalEarned = completedContracts.reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0);
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalEscrowed = activeContracts.reduce((sum, c) => sum + parseFloat(c.totalAmount || '0'), 0);
  const revenueSplit = (squad.revenueSplitDefault || { lead: 30, members: 50, treasury: 20 }) as Record<string, number>;
  const memberDistribution = 100 - treasuryPct;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Financial Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          <Link href={`/squads/${squadId}`} className="hover:text-accent-squad transition-colors">
            {squad.name}
          </Link>{' '}
          &mdash; Track earnings, payouts, and financial activity
        </p>
      </div>

      {/* Multisig Address */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Payment Wallet (Base)</h2>
          <Link href={`/squads/${squadId}`} className="text-xs text-accent-squad hover:underline">
            Manage
          </Link>
        </div>
        {squad.multisigAddress ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-escrow/10 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-escrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-mono text-text-primary truncate">{squad.multisigAddress}</p>
              <a
                href={`https://basescan.org/address/${squad.multisigAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-agent hover:underline"
              >
                View on Basescan
              </a>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">
            No multisig address configured.{' '}
            <Link href={`/squads/${squadId}`} className="text-accent-squad hover:underline">Set one up</Link>{' '}
            to receive USDC payments on Base.
          </p>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalEarned)}</p>
          <p className="text-xs text-text-secondary mt-1">{completedContracts.length} completed contracts</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">In Escrow</p>
          <p className="text-2xl font-bold text-escrow">{formatCurrency(totalEscrowed)}</p>
          <p className="text-xs text-text-secondary mt-1">{activeContracts.length} active contracts</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Payment Method</p>
          <p className="text-2xl font-bold text-accent-agent">USDC</p>
          <p className="text-xs text-text-secondary mt-1">On Base via escrow contract</p>
        </div>
      </div>

      {/* Treasury Split Configuration */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Treasury Split Configuration
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Configure how contract payments flow between the squad treasury (multisig) and individual members.
        </p>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text-primary">% to Squad Treasury (Multisig)</label>
            <span className="text-sm font-bold text-accent-agent">{treasuryPct}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={treasuryPct}
            onChange={(e) => setTreasuryPct(Number(e.target.value))}
            className="w-full h-2 bg-bg-secondary rounded-lg appearance-none cursor-pointer accent-accent-agent"
          />
          <div className="flex justify-between text-xs text-text-secondary mt-1">
            <span>0% (all to members)</span>
            <span>80% max</span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-text-primary">% Distributed to Members</span>
          <span className="text-sm font-bold text-accent-squad">{memberDistribution}%</span>
        </div>

        {/* Example calculation */}
        <div className="bg-bg-primary rounded-lg p-4 mb-4">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">
            Example: $10,000 Contract
          </p>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1">
              <p className="text-text-secondary">Treasury (multisig)</p>
              <p className="font-bold text-accent-agent">{formatCurrency(10000 * (treasuryPct / 100))}</p>
            </div>
            <div className="text-text-secondary">+</div>
            <div className="flex-1">
              <p className="text-text-secondary">Split among members</p>
              <p className="font-bold text-accent-squad">{formatCurrency(10000 * (memberDistribution / 100))}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleSaveTreasurySplit}
          disabled={savingSplit}
          className="px-4 py-2 bg-accent-agent text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {savingSplit ? 'Saving...' : 'Save Treasury Split'}
        </button>
      </section>

      {/* Revenue Split */}
      <section className="bg-white rounded-xl border border-border p-6 mb-4">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Revenue Split Configuration
        </h2>
        <div className="space-y-3">
          {Object.entries(revenueSplit).map(([key, value]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-text-primary capitalize">{key}</span>
                <span className="text-sm font-semibold text-text-primary">{value}%</span>
              </div>
              <div className="w-full bg-bg-secondary rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    key === 'lead'
                      ? 'bg-accent-squad'
                      : key === 'members'
                        ? 'bg-accent-agent'
                        : 'bg-accent-client'
                  }`}
                  style={{ width: `${value}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Revenue split applied to completed contracts */}
        {completedContracts.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Projected Distribution from Completed Contracts
            </h3>
            <div className="space-y-2">
              {Object.entries(revenueSplit).map(([key, pct]) => {
                const amount = totalEarned * (pct / 100);
                return (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <span className="text-text-secondary capitalize">{key} ({pct}%)</span>
                    <span className="font-semibold text-text-primary">{formatCurrency(amount)}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-text-secondary mt-3">
              All distributions are in USDC on Base, released per deliverable approval.
            </p>
          </div>
        )}
      </section>

      {/* Contract Transactions */}
      <section className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Contract History
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-text-secondary">Contract</th>
                <th className="text-right py-2 px-4 font-medium text-text-secondary">Amount (USDC)</th>
                <th className="text-left py-2 px-4 font-medium text-text-secondary">Status</th>
                <th className="text-right py-2 pl-4 font-medium text-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-text-secondary text-sm">
                    No contracts yet. Completed contracts will appear here.
                  </td>
                </tr>
              ) : contracts.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4">
                    <Link href={`/contracts/${c.id}`} className="font-medium text-text-primary hover:text-accent-squad transition-colors">
                      {c.title}
                    </Link>
                    <p className="text-xs text-text-secondary mt-0.5">{c.clientName}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-text-primary">
                    {formatCurrency(parseFloat(c.totalAmount || '0'))}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : c.status === 'active'
                            ? 'bg-accent-agent/10 text-accent-agent'
                            : c.status === 'pending_deposit'
                              ? 'bg-accent-client/10 text-accent-client'
                              : c.status === 'disputed'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      {c.status === 'completed' ? 'Paid' : c.status === 'active' ? 'In Escrow' : c.status === 'pending_deposit' ? 'Awaiting Deposit' : c.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right text-text-secondary text-xs">
                    {c.completedAt
                      ? new Date(c.completedAt).toLocaleDateString()
                      : new Date(c.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
