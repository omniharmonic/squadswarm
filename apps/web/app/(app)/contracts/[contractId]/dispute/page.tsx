'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────── */

interface DisputeResolution {
  type: string;
  text: string;
  clientPercentage: number;
  squadPercentage: number;
  resolvedAt: string;
  txHash: string | null;
}

interface Dispute {
  id: string;
  contractId: string;
  status: string;
  reason: string;
  raisedById: string;
  resolution: DisputeResolution | null;
  evidence: unknown;
  createdAt: string;
  updatedAt: string;
}

interface ContractInfo {
  title: string;
  totalAmount: string;
  status: string;
}

type ResolutionType = 'full_client' | 'full_squad' | 'split' | 'negotiated';

const DISPUTE_CATEGORIES = [
  { value: 'quality', label: 'Quality Issues' },
  { value: 'timeline', label: 'Timeline / Delays' },
  { value: 'communication', label: 'Communication' },
  { value: 'scope_change', label: 'Scope Change' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value);
}

/* ── Main Page ─────────────────────────────────── */

export default function DisputePage() {
  const params = useParams();
  const contractId = params.contractId as string;

  // Contract and dispute data
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [squadName, setSquadName] = useState('');

  // Raise dispute form
  const [showRaiseForm, setShowRaiseForm] = useState(false);
  const [raiseReason, setRaiseReason] = useState('');
  const [raiseCategory, setRaiseCategory] = useState('quality');
  const [raising, setRaising] = useState(false);

  // Resolve dispute form
  const [resolutionType, setResolutionType] = useState<ResolutionType>('split');
  const [clientPct, setClientPct] = useState(50);
  const [squadPct, setSquadPct] = useState(50);
  const [resolutionReason, setResolutionReason] = useState('');
  const [txHash, setTxHash] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Fetch contract disputes
      const disputesRes = await fetch(`/api/contracts/${contractId}/disputes`);
      if (disputesRes.ok) {
        const data = await disputesRes.json();
        setDisputes(data);

        // If there's at least one dispute, fetch its details for contract info
        if (data.length > 0) {
          const detailRes = await fetch(`/api/contracts/${contractId}/disputes/${data[0].id}`);
          if (detailRes.ok) {
            const detail = await detailRes.json();
            setContractInfo(detail.contract);
            setSquadName(detail.squadName);
          }
        }
      }

      // Fetch contract info separately if no disputes found
      const contractRes = await fetch(`/api/contracts/${contractId}`);
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        setContractInfo({
          title: contractData.title,
          totalAmount: contractData.totalAmount,
          status: contractData.status,
        });
        if (contractData.squadName) setSquadName(contractData.squadName);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Set percentages based on resolution type
  function handleResolutionTypeChange(type: ResolutionType) {
    setResolutionType(type);
    switch (type) {
      case 'full_client':
        setClientPct(100);
        setSquadPct(0);
        break;
      case 'full_squad':
        setClientPct(0);
        setSquadPct(100);
        break;
      case 'split':
        setClientPct(50);
        setSquadPct(50);
        break;
      case 'negotiated':
        // Keep current values for custom
        break;
    }
  }

  async function handleRaiseDispute() {
    if (!raiseReason.trim()) return;
    setRaising(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: `[${raiseCategory}] ${raiseReason.trim()}`,
        }),
      });
      if (res.ok) {
        toast.success('Dispute raised successfully');
        setRaiseReason('');
        setRaiseCategory('quality');
        setShowRaiseForm(false);
        await fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to raise dispute');
      }
    } catch {
      toast.error('Failed to raise dispute');
    } finally {
      setRaising(false);
    }
  }

  async function handleResolveDispute(disputeId: string) {
    if (!resolutionReason.trim()) {
      toast.error('Please provide a reason for the resolution');
      return;
    }
    if (clientPct + squadPct !== 100) {
      toast.error('Percentages must sum to 100');
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionType,
          clientPercentage: clientPct,
          squadPercentage: squadPct,
          reason: resolutionReason.trim(),
          txHash: txHash.trim() || undefined,
        }),
      });
      if (res.ok) {
        toast.success('Dispute resolved successfully');
        setResolutionReason('');
        setTxHash('');
        await fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to resolve dispute');
      }
    } catch {
      toast.error('Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  }

  const activeDispute = disputes.find((d) => d.status === 'raised');
  const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
  const totalAmount = contractInfo ? Number(contractInfo.totalAmount) : 0;

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12">
        <div className="bg-white rounded-2xl border border-border p-12 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-bg-secondary rounded w-1/3 mx-auto" />
            <div className="h-4 bg-bg-secondary rounded w-1/2 mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href={`/contracts/${contractId}`}
          className="text-sm text-accent-agent hover:text-accent-agent-hover transition-colors"
        >
          &larr; Back to Contract
        </Link>
        <h1 className="text-2xl font-bold text-text-primary mt-2">Dispute Resolution</h1>
        {contractInfo && (
          <p className="text-sm text-text-secondary mt-1">
            {contractInfo.title} &mdash; {formatCurrency(totalAmount)} USDC
            {squadName && <> with {squadName}</>}
          </p>
        )}
      </div>

      {/* Active dispute warning banner */}
      {activeDispute && (
        <div className="bg-warning/10 border-2 border-warning/30 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-warning mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.66 21H3.34a1 1 0 01-.86-1.41L12 3z" />
            </svg>
            <div>
              <h2 className="text-sm font-semibold text-warning uppercase tracking-wide">This contract has an active dispute</h2>
              <p className="text-sm text-text-primary mt-1">
                Payments are paused until the dispute is resolved. Both parties must agree on a resolution to release escrowed funds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active dispute details + resolution form */}
      {activeDispute && (
        <div className="bg-white rounded-2xl border border-border p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-warning/10 text-warning uppercase tracking-wide">
                Open
              </span>
              <span className="text-xs text-text-muted">
                Raised {new Date(activeDispute.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
            <h3 className="text-base font-semibold text-text-primary mb-2">Dispute Reason</h3>
            <p className="text-sm text-text-primary bg-bg-secondary rounded-xl p-4">{activeDispute.reason}</p>
          </div>

          {/* Resolution form */}
          <div className="border-t border-border pt-5">
            <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide mb-4">Resolve This Dispute</h3>

            {/* Quick resolution options */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {([
                { type: 'full_client' as const, label: 'Full Refund', desc: '100% to client' },
                { type: 'full_squad' as const, label: 'Full Payment', desc: '100% to squad' },
                { type: 'split' as const, label: '50/50 Split', desc: 'Equal split' },
                { type: 'negotiated' as const, label: 'Custom Split', desc: 'Set percentages' },
              ]).map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => handleResolutionTypeChange(opt.type)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    resolutionType === opt.type
                      ? 'border-accent-squad bg-accent-squad/5 ring-2 ring-accent-squad/20'
                      : 'border-border hover:border-accent-squad/40 hover:bg-bg-secondary'
                  }`}
                >
                  <p className="text-sm font-medium text-text-primary">{opt.label}</p>
                  <p className="text-xs text-text-muted mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>

            {/* Custom percentage inputs */}
            {resolutionType === 'negotiated' && (
              <div className="flex items-center gap-4 mb-4 p-4 bg-bg-secondary rounded-xl">
                <div className="flex-1">
                  <label className="text-xs font-medium text-text-secondary block mb-1">Client Percentage</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={clientPct}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                        setClientPct(v);
                        setSquadPct(100 - v);
                      }}
                      className="w-20 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
                    />
                    <span className="text-sm text-text-muted">%</span>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-text-secondary block mb-1">Squad Percentage</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={squadPct}
                      onChange={(e) => {
                        const v = Math.min(100, Math.max(0, Number(e.target.value)));
                        setSquadPct(v);
                        setClientPct(100 - v);
                      }}
                      className="w-20 rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
                    />
                    <span className="text-sm text-text-muted">%</span>
                  </div>
                </div>
              </div>
            )}

            {/* Split preview */}
            <div className="flex items-center gap-3 mb-4 p-3 bg-bg-secondary rounded-xl">
              <div className="flex-1 text-center">
                <p className="text-xs text-text-muted">Client receives</p>
                <p className="text-lg font-semibold text-text-primary">
                  {formatCurrency(totalAmount * clientPct / 100)}
                </p>
                <p className="text-xs text-text-secondary">{clientPct}%</p>
              </div>
              <div className="w-px h-10 bg-border" />
              <div className="flex-1 text-center">
                <p className="text-xs text-text-muted">Squad receives</p>
                <p className="text-lg font-semibold text-text-primary">
                  {formatCurrency(totalAmount * squadPct / 100)}
                </p>
                <p className="text-xs text-text-secondary">{squadPct}%</p>
              </div>
            </div>

            {/* Resolution reason */}
            <div className="mb-4">
              <label className="text-xs font-medium text-text-secondary block mb-1.5">Resolution Reason</label>
              <textarea
                value={resolutionReason}
                onChange={(e) => setResolutionReason(e.target.value)}
                placeholder="Explain the rationale for this resolution..."
                rows={3}
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
              />
            </div>

            {/* Optional tx hash */}
            <div className="mb-5">
              <label className="text-xs font-medium text-text-secondary block mb-1.5">
                On-Chain Transaction Hash <span className="text-text-muted">(optional)</span>
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
              />
              <p className="text-xs text-text-muted mt-1">
                If you resolved the dispute on-chain via the escrow contract, paste the transaction hash here.
              </p>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => handleResolveDispute(activeDispute.id)}
                disabled={resolving || !resolutionReason.trim()}
                className="px-6 py-2.5 bg-accent-squad text-white rounded-xl text-sm font-medium hover:bg-accent-squad-hover disabled:opacity-50 transition-all"
              >
                {resolving ? 'Resolving...' : 'Resolve Dispute'}
              </button>
            </div>

            <p className="text-xs text-text-muted mt-3">
              Resolution will split the remaining escrow funds according to the percentages above.
              This action cannot be undone.
            </p>
          </div>
        </div>
      )}

      {/* Resolved disputes */}
      {resolvedDisputes.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Resolved Disputes</h2>
          {resolvedDisputes.map((d) => {
            const res = d.resolution as DisputeResolution | null;
            return (
              <div key={d.id} className="bg-white rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-success/10 text-success uppercase tracking-wide">
                    Resolved
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                <p className="text-sm text-text-primary mb-4">{d.reason}</p>

                {res && (
                  <div className="bg-success/5 border border-success/20 rounded-xl p-4 space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-success uppercase tracking-wide mb-1">Resolution</p>
                      <p className="text-sm text-text-primary">{res.text}</p>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-text-muted">Client: </span>
                        <span className="font-medium text-text-primary">
                          {res.clientPercentage}% ({formatCurrency(totalAmount * res.clientPercentage / 100)})
                        </span>
                      </div>
                      <div>
                        <span className="text-text-muted">Squad: </span>
                        <span className="font-medium text-text-primary">
                          {res.squadPercentage}% ({formatCurrency(totalAmount * res.squadPercentage / 100)})
                        </span>
                      </div>
                    </div>

                    {res.resolvedAt && (
                      <p className="text-xs text-text-muted">
                        Resolved on {new Date(res.resolvedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    )}

                    {res.txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${res.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-accent-agent hover:text-accent-agent-hover font-mono transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View on BaseScan
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No dispute state — show raise form */}
      {!activeDispute && disputes.length === 0 && contractInfo?.status !== 'completed' && (
        <div className="bg-white rounded-2xl border border-border p-6">
          {!showRaiseForm ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-bg-secondary rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-text-primary mb-1">No Active Disputes</h3>
              <p className="text-sm text-text-secondary mb-4">
                This contract has no open disputes. If there is an issue with the project, you can raise a dispute to pause payments and begin resolution.
              </p>
              <button
                onClick={() => setShowRaiseForm(true)}
                className="px-5 py-2.5 border border-warning text-warning rounded-xl text-sm font-medium hover:bg-warning/5 transition-colors"
              >
                Raise a Dispute
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Raise a Dispute</h3>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Category</label>
                <select
                  value={raiseCategory}
                  onChange={(e) => setRaiseCategory(e.target.value)}
                  className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-agent/40"
                >
                  {DISPUTE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">Describe the Issue</label>
                <textarea
                  value={raiseReason}
                  onChange={(e) => setRaiseReason(e.target.value)}
                  placeholder="Provide details about the issue..."
                  rows={4}
                  className="w-full rounded-xl border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-warning/40"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowRaiseForm(false); setRaiseReason(''); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={raising || !raiseReason.trim()}
                  className="px-5 py-2.5 bg-warning text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {raising ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* No disputes and contract is completed */}
      {disputes.length === 0 && contractInfo?.status === 'completed' && (
        <div className="bg-white rounded-2xl border border-border p-6 text-center py-8">
          <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">Contract Completed</h3>
          <p className="text-sm text-text-secondary">
            This contract was completed without any disputes.
          </p>
        </div>
      )}
    </div>
  );
}
