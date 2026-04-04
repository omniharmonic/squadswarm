'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface SquadData {
  id: string;
  name: string;
  revenueSplitDefault: Record<string, number> | null;
  paymentMode: string;
}

const MOCK_SQUAD: SquadData = {
  id: 'mock-squad-1',
  name: 'Regen Builders',
  revenueSplitDefault: { lead: 30, members: 50, treasury: 20 },
  paymentMode: 'fiat',
};

const MOCK_TRANSACTIONS = [
  { id: 't1', project: 'Regen Commons Dashboard', amount: 11000, status: 'completed', date: 'Mar 15, 2026' },
  { id: 't2', project: 'Brand Blueprint Design', amount: 7500, status: 'completed', date: 'Feb 28, 2026' },
  { id: 't3', project: 'Data Pipeline Integration', amount: 5000, status: 'in_progress', date: 'Active' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

export default function FinancialDashboardPage() {
  const params = useParams();
  const squadId = params.squadId as string;

  const [squad, setSquad] = useState<SquadData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSquad() {
      try {
        const res = await fetch(`/api/squads/${squadId}`);
        if (!res.ok) throw new Error('Failed');
        const data = await res.json();
        setSquad(data);
      } catch {
        setSquad(MOCK_SQUAD);
      } finally {
        setLoading(false);
      }
    }
    fetchSquad();
  }, [squadId]);

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

  if (!squad) return null;

  const totalEarned = MOCK_TRANSACTIONS.reduce((sum, t) => sum + t.amount, 0);
  const completedContracts = MOCK_TRANSACTIONS.filter((t) => t.status === 'completed').length;
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Total Earned</p>
          <p className="text-2xl font-bold text-text-primary">{formatCurrency(totalEarned)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Contracts Completed</p>
          <p className="text-2xl font-bold text-text-primary">{completedContracts}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-6">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">Payment Mode</p>
          <p className="text-2xl font-bold text-text-primary capitalize">{squad.paymentMode}</p>
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
      </section>

      {/* Transactions */}
      <section className="bg-white rounded-xl border border-border p-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">
          Transactions
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-4 font-medium text-text-secondary">Project</th>
                <th className="text-right py-2 px-4 font-medium text-text-secondary">Amount</th>
                <th className="text-left py-2 px-4 font-medium text-text-secondary">Status</th>
                <th className="text-right py-2 pl-4 font-medium text-text-secondary">Date</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-medium text-text-primary">{tx.project}</td>
                  <td className="py-3 px-4 text-right font-semibold text-text-primary">{formatCurrency(tx.amount)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        tx.status === 'completed'
                          ? 'bg-success/10 text-success'
                          : 'bg-accent-client/10 text-accent-client'
                      }`}
                    >
                      {tx.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </td>
                  <td className="py-3 pl-4 text-right text-text-secondary">{tx.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
