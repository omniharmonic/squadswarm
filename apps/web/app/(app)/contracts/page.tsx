'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Contract = {
  id: string;
  title: string;
  status: string;
  totalAmount: string | null;
  squadId: string;
  clientId: string;
  squadName: string;
  clientName: string;
  createdAt: string;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending_deposit: { bg: 'bg-accent-client/10', text: 'text-accent-client', label: 'Pending Deposit' },
  active: { bg: 'bg-success/10', text: 'text-success', label: 'Active' },
  completed: { bg: 'bg-accent-agent/10', text: 'text-accent-agent', label: 'Completed' },
  disputed: { bg: 'bg-error/10', text: 'text-error', label: 'Disputed' },
  cancelled: { bg: 'bg-bg-secondary', text: 'text-text-secondary', label: 'Cancelled' },
  draft: { bg: 'bg-bg-secondary', text: 'text-text-secondary', label: 'Draft' },
};

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLES[status] || { bg: 'bg-bg-secondary', text: 'text-text-secondary', label: status };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/contracts')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContracts(data);
        } else if (data.error) {
          setError(data.error);
        }
      })
      .catch(() => setError('Failed to load contracts'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-error text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">My Contracts</h1>
          <p className="text-text-secondary mt-1">Track your active and past contracts.</p>
        </div>
        <Link
          href="/scopes"
          className="px-4 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Browse Scopes
        </Link>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">No contracts yet</h2>
          <p className="text-text-secondary text-sm mb-6">
            Browse the Scope Board to find work.
          </p>
          <Link
            href="/scopes"
            className="inline-flex px-5 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Browse Scopes
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <Link
              key={contract.id}
              href={`/contracts/${contract.id}`}
              className="block bg-white rounded-xl border border-border p-5 hover:border-accent-squad/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-text-primary truncate">{contract.title}</h3>
                    <StatusBadge status={contract.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-text-secondary">
                    <span>Squad: {contract.squadName}</span>
                    <span>Client: {contract.clientName}</span>
                  </div>
                </div>
                {contract.totalAmount && (
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-text-primary">
                      ${parseFloat(contract.totalAmount).toLocaleString()}
                    </p>
                    <p className="text-xs text-text-secondary">Total</p>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
