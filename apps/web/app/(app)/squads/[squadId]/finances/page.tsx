'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SquadData {
  id: string;
  name: string;
  revenueSplitDefault: Record<string, number> | null;
  paymentMode: string;
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
  const [paymentMode, setPaymentMode] = useState<'fiat' | 'crypto'>('fiat');
  const [savingMode, setSavingMode] = useState(false);

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
          setPaymentMode(squadData.paymentMode === 'crypto' ? 'crypto' : 'fiat');
        }

        if (contractsRes.ok) {
          const allContracts: ContractRecord[] = await contractsRes.json();
          // Filter to contracts belonging to this squad
          const squadContracts = allContracts.filter((c) => {
            // The contract API returns squadId — but the enriched version may not expose it directly.
            // We use squadName match or check the raw data.
            // The contracts API returns full contract objects with squadId
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

  async function handlePaymentModeChange(mode: 'fiat' | 'crypto') {
    setSavingMode(true);
    try {
      const res = await fetch(`/api/squads/${squadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMode: mode }),
      });
      if (res.ok) {
        setPaymentMode(mode);
        setSquad((prev) => prev ? { ...prev, paymentMode: mode } : prev);
      }
    } catch {
      // silently fail
    } finally {
      setSavingMode(false);
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
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">Payment Wallet</h2>
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
            to receive crypto payments.
          </p>
        )}
      </div>

      {/* Payment Mode Selector */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Payment Mode</h2>
        <div className="flex gap-3">
          <button
            onClick={() => handlePaymentModeChange('fiat')}
            disabled={savingMode}
            className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
              paymentMode === 'fiat'
                ? 'border-accent-client bg-accent-client/5'
                : 'border-border hover:border-accent-client/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-accent-client" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              <span className="font-semibold text-text-primary">Fiat (Stripe)</span>
            </div>
            <p className="text-xs text-text-secondary">Credit card and bank transfer payments via Stripe</p>
          </button>
          <button
            onClick={() => handlePaymentModeChange('crypto')}
            disabled={savingMode}
            className={`flex-1 rounded-lg border-2 p-4 text-left transition-all ${
              paymentMode === 'crypto'
                ? 'border-accent-agent bg-accent-agent/5'
                : 'border-border hover:border-accent-agent/40'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5 text-accent-agent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.893 13.393l-1.135-1.135a2.252 2.252 0 01-.421-.585l-1.08-2.16a.414.414 0 00-.663-.107.827.827 0 01-.812.21l-1.273-.363a.89.89 0 00-.738 1.595l.587.39c.59.395.674 1.23.172 1.732l-.2.2c-.212.212-.33.498-.33.796v.41c0 .409-.11.809-.32 1.158l-1.315 2.191a2.11 2.11 0 01-1.81 1.025 1.055 1.055 0 01-1.055-1.055v-1.172c0-.92-.56-1.747-1.414-2.089l-.655-.261a2.25 2.25 0 01-1.383-2.46l.007-.042a2.25 2.25 0 01.29-.787l.09-.15a2.25 2.25 0 012.37-1.048l1.178.236a1.125 1.125 0 001.302-.795l.208-.73a1.125 1.125 0 00-.578-1.315l-.665-.332-.091.091a2.25 2.25 0 01-1.591.659h-.18c-.249 0-.487.1-.662.274a.931.931 0 01-1.458-1.137l1.411-2.353a2.25 2.25 0 00.286-.76M11.25 2.25L12 2.25" />
              </svg>
              <span className="font-semibold text-text-primary">Crypto (USDC)</span>
            </div>
            <p className="text-xs text-text-secondary">USDC payments on Base via multisig wallet</p>
          </button>
        </div>
        {paymentMode === 'crypto' && !squad.multisigAddress && (
          <p className="text-xs text-warning mt-2">
            You need to configure a multisig wallet address to receive crypto payments.
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
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Payment Mode</p>
          <p className="text-2xl font-bold text-text-primary capitalize">{paymentMode}</p>
          <p className="text-xs text-text-secondary mt-1">{paymentMode === 'crypto' ? 'USDC on Base' : 'Via Stripe'}</p>
        </div>
      </div>

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
                <th className="text-right py-2 px-4 font-medium text-text-secondary">Amount</th>
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
