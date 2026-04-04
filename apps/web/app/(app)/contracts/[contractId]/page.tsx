'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

/* ── Rating types & helpers ─────────────────────────────────── */
interface Rating {
  overall: number;
  quality: number;
  communication: number;
  timeliness: number;
  wouldRehire: boolean;
  feedback: string | null;
  createdAt: string;
}

function StarSelector({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          className={`text-lg transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
          onMouseEnter={() => !readonly && setHover(star)}
          onMouseLeave={() => !readonly && setHover(0)}
          onClick={() => onChange?.(star)}
        >
          <svg
            className={`w-5 h-5 ${(hover || value) >= star ? 'text-amber-400' : 'text-gray-200'}`}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-secondary">{label}</span>
      <StarSelector value={value} readonly />
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  pending_deposit: 'bg-accent-client/10 text-accent-client',
  active: 'bg-success/10 text-success',
  completed: 'bg-accent-agent/10 text-accent-agent',
  paused: 'bg-warning/10 text-warning',
  cancelled: 'bg-error/10 text-error',
  disputed: 'bg-warning/10 text-warning',
  draft: 'bg-bg-secondary text-text-secondary',
};

const DELIVERABLE_STATUS_STYLES: Record<string, { bg: string; label: string }> = {
  not_started: { bg: 'bg-bg-secondary', label: 'Not Started' },
  in_progress: { bg: 'bg-accent-client/10 text-accent-client', label: 'In Progress' },
  in_review: { bg: 'bg-escrow/10 text-escrow', label: 'In Review' },
  revision_requested: { bg: 'bg-warning/10 text-warning', label: 'Revision Requested' },
  approved: { bg: 'bg-success/10 text-success', label: 'Approved' },
  blocked: { bg: 'bg-error/10 text-error', label: 'Blocked' },
};

interface Deliverable {
  id: string;
  title: string;
  status: string;
  format: string;
  assignee: string;
}

interface Workstream {
  id: string;
  title: string;
  status: string;
  deliverables: Deliverable[];
}

interface Contract {
  id: string;
  title: string;
  status: string;
  clientName: string;
  squadName: string;
  totalAmount: string;
  feedbackRoundsTotal: number;
  feedbackRoundsUsed: number;
  startedAt: string;
  workstreams: Workstream[];
}

interface Dispute {
  id: string;
  reason: string;
  status: string;
  resolution: { text: string; clientPercentage: number; squadPercentage: number } | null;
  createdAt: string;
}

export default function ContractOverviewPage() {
  const params = useParams();
  const contractId = params.contractId as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [funding, setFunding] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [raisingDispute, setRaisingDispute] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [resolutionText, setResolutionText] = useState('');
  const [clientPct, setClientPct] = useState(50);
  const [squadPct, setSquadPct] = useState(50);
  const [resolving, setResolving] = useState(false);

  // Rating state
  const [existingRating, setExistingRating] = useState<Rating | null>(null);
  const [ratingOverall, setRatingOverall] = useState(0);
  const [ratingQuality, setRatingQuality] = useState(0);
  const [ratingComm, setRatingComm] = useState(0);
  const [ratingTimeliness, setRatingTimeliness] = useState(0);
  const [wouldRehire, setWouldRehire] = useState(true);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingError, setRatingError] = useState('');

  const fetchRating = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/rate`);
      if (res.ok) {
        const data = await res.json();
        if (data.rating) setExistingRating(data.rating);
      }
    } catch {
      // ignore
    }
  }, [contractId]);

  async function handleSubmitRating() {
    if (ratingOverall === 0 || ratingQuality === 0 || ratingComm === 0 || ratingTimeliness === 0) {
      setRatingError('Please provide all star ratings.');
      return;
    }
    setSubmittingRating(true);
    setRatingError('');
    try {
      const res = await fetch(`/api/contracts/${contractId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overall: ratingOverall,
          quality: ratingQuality,
          communication: ratingComm,
          timeliness: ratingTimeliness,
          wouldRehire,
          feedback: ratingFeedback || undefined,
        }),
      });
      if (res.ok) {
        await fetchRating();
      } else {
        const err = await res.json();
        setRatingError(err.error || 'Failed to submit rating');
      }
    } catch {
      setRatingError('Network error');
    } finally {
      setSubmittingRating(false);
    }
  }

  async function fetchContract() {
    try {
      const res = await fetch(`/api/contracts/${contractId}`);
      if (res.ok) {
        const data = await res.json();
        setContract({
          id: data.id,
          title: data.title,
          status: data.status,
          clientName: data.clientName,
          squadName: data.squadName,
          totalAmount: data.totalAmount,
          feedbackRoundsTotal: data.feedbackRoundsTotal ?? 3,
          feedbackRoundsUsed: data.feedbackRoundsUsed ?? 0,
          startedAt: data.startedAt || data.createdAt,
          workstreams: (data.workstreams || []).map((ws: Record<string, unknown>) => ({
            id: ws.id,
            title: ws.title,
            status: ws.status || 'not_started',
            deliverables: ((ws.deliverables as Record<string, unknown>[]) || []).map((d: Record<string, unknown>) => ({
              id: d.id,
              title: d.title,
              status: d.status || 'not_started',
              format: d.format || 'document',
              assignee: d.assignee || 'Unassigned',
            })),
          })),
        });
      }
    } catch {
      // Leave contract as null on failure
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchContract();
    fetchRating();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractId, fetchRating]);

  async function handleFundContract() {
    setFunding(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/deposit`, { method: 'POST' });
      if (res.ok) {
        await fetchContract();
      }
    } catch {
      // Silently fail for demo
    } finally {
      setFunding(false);
    }
  }

  async function fetchDisputes() {
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes`);
      if (res.ok) {
        const data = await res.json();
        setDisputes(data);
      }
    } catch {
      // Silently fail for demo
    }
  }

  async function handleRaiseDispute() {
    if (!disputeReason.trim()) return;
    setRaisingDispute(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      if (res.ok) {
        setDisputeReason('');
        setShowDisputeForm(false);
        await fetchContract();
        await fetchDisputes();
      }
    } catch {
      // Silently fail for demo
    } finally {
      setRaisingDispute(false);
    }
  }

  async function handleResolveDispute(disputeId: string) {
    if (!resolutionText.trim()) return;
    setResolving(true);
    try {
      const res = await fetch(`/api/contracts/${contractId}/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: resolutionText.trim(),
          clientPercentage: clientPct,
          squadPercentage: squadPct,
        }),
      });
      if (res.ok) {
        setResolutionText('');
        await fetchContract();
        await fetchDisputes();
      }
    } catch {
      // Silently fail for demo
    } finally {
      setResolving(false);
    }
  }

  useEffect(() => {
    if (contract?.status === 'disputed') {
      fetchDisputes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract?.status]);

  if (!contract) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">Unable to load contract data</h3>
          <p className="text-text-secondary text-sm">No data yet. Please check your connection or try again later.</p>
        </div>
      </div>
    );
  }

  const allDeliverables = contract.workstreams.flatMap((ws) => ws.deliverables);
  const approvedCount = allDeliverables.filter((d) => d.status === 'approved').length;
  const totalCount = allDeliverables.length;
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0;

  const daysActive = contract.startedAt
    ? Math.floor((Date.now() - new Date(contract.startedAt).getTime()) / 86400000)
    : 0;

  const tabs = [
    { label: 'Board', href: `/contracts/${contractId}/board` },
    { label: 'Timeline', href: `/contracts/${contractId}/timeline` },
    { label: 'Files', href: `/contracts/${contractId}/files` },
    { label: 'Discussion', href: `/contracts/${contractId}/discussion` },
    { label: 'PM Dashboard', href: `/contracts/${contractId}/pm` },
    { label: 'Client Review', href: `/contracts/${contractId}/review` },
  ];

  if (loading) {
    return (
      <div className="max-w-5xl">
        <div className="bg-white rounded-xl border border-border p-6 mb-6 animate-pulse">
          <div className="h-8 bg-bg-secondary rounded w-1/3 mb-4" />
          <div className="h-4 bg-bg-secondary rounded w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-text-primary">{contract.title}</h1>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${STATUS_STYLES[contract.status] || STATUS_STYLES.draft}`}
              >
                {contract.status}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span>
                Client: <span className="font-medium text-accent-client">{contract.clientName}</span>
              </span>
              <span className="text-border">|</span>
              <span>
                Squad: <span className="font-medium text-accent-squad">{contract.squadName}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-text-secondary">
              Deliverable Progress
            </span>
            <span className="font-medium text-text-primary">
              {approvedCount} of {totalCount} approved ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-success rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Total Amount</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            ${parseFloat(contract.totalAmount).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Days Active</p>
          <p className="text-xl font-bold text-text-primary mt-1">{daysActive}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Feedback Rounds</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {contract.feedbackRoundsUsed}{' '}
            <span className="text-sm font-normal text-text-secondary">
              of {contract.feedbackRoundsTotal}
            </span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide">Deliverables</p>
          <p className="text-xl font-bold text-text-primary mt-1">
            {approvedCount}{' '}
            <span className="text-sm font-normal text-text-secondary">
              of {totalCount} done
            </span>
          </p>
        </div>
      </div>

      {/* Payment status */}
      <div className="bg-white rounded-xl border border-border p-5 mb-6">
        <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">Payment Status</h2>
        {contract.status === 'pending_deposit' && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-primary font-medium">Awaiting deposit to begin work</p>
              <p className="text-sm text-text-secondary mt-0.5">
                Fund ${parseFloat(contract.totalAmount).toLocaleString()} to start work
              </p>
            </div>
            <button
              onClick={handleFundContract}
              disabled={funding}
              className="px-5 py-2.5 bg-accent-client text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {funding ? 'Processing...' : `Fund $${parseFloat(contract.totalAmount).toLocaleString()}`}
            </button>
          </div>
        )}
        {contract.status === 'active' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Funded
            </span>
            <span className="text-text-primary font-medium">
              ${parseFloat(contract.totalAmount).toLocaleString()} deposited
            </span>
          </div>
        )}
        {contract.status === 'completed' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent-agent/10 text-accent-agent rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Completed &amp; Paid
            </span>
            <span className="text-text-primary font-medium">
              ${parseFloat(contract.totalAmount).toLocaleString()} released
            </span>
          </div>
        )}
        {contract.status === 'disputed' && (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-warning/10 text-warning rounded-full text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.66 21H3.34a1 1 0 01-.86-1.41L12 3z" /></svg>
              Disputed
            </span>
            <span className="text-text-primary font-medium">
              ${parseFloat(contract.totalAmount).toLocaleString()} held in escrow
            </span>
          </div>
        )}
      </div>

      {/* Dispute section */}
      {contract.status === 'active' && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">Dispute</h2>
              <p className="text-sm text-text-secondary mt-0.5">If there is an issue, raise a dispute to pause work and begin resolution.</p>
            </div>
            {!showDisputeForm && (
              <button
                onClick={() => setShowDisputeForm(true)}
                className="px-4 py-2 border border-warning text-warning rounded-lg text-sm font-medium hover:bg-warning/5 transition-colors"
              >
                Raise Dispute
              </button>
            )}
          </div>
          {showDisputeForm && (
            <div className="mt-4 space-y-3">
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue in detail..."
                rows={3}
                className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-warning/40"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowDisputeForm(false); setDisputeReason(''); }}
                  className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRaiseDispute}
                  disabled={raisingDispute || !disputeReason.trim()}
                  className="px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {raisingDispute ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {contract.status === 'disputed' && (
        <div className="bg-white rounded-xl border border-warning/30 p-5 mb-6">
          <h2 className="text-sm font-semibold text-warning uppercase tracking-wide mb-4">Active Disputes</h2>
          {disputes.length === 0 && (
            <p className="text-sm text-text-secondary">Loading disputes...</p>
          )}
          {disputes.map((d) => (
            <div key={d.id} className="border border-border rounded-lg p-4 mb-3 last:mb-0">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.status === 'resolved' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {d.status}
                  </span>
                  <span className="text-xs text-text-secondary ml-2">
                    {new Date(d.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p className="text-sm text-text-primary mb-3">{d.reason}</p>

              {d.status === 'resolved' && d.resolution && (
                <div className="bg-success/5 rounded-lg p-3 text-sm">
                  <p className="font-medium text-success mb-1">Resolution</p>
                  <p className="text-text-primary">{d.resolution.text}</p>
                  <div className="flex gap-4 mt-2 text-xs text-text-secondary">
                    <span>Client: {d.resolution.clientPercentage}%</span>
                    <span>Squad: {d.resolution.squadPercentage}%</span>
                  </div>
                </div>
              )}

              {d.status === 'raised' && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Resolve Dispute</p>
                  <textarea
                    value={resolutionText}
                    onChange={(e) => setResolutionText(e.target.value)}
                    placeholder="Describe the resolution..."
                    rows={2}
                    className="w-full rounded-lg border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-warning/40"
                  />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary">Client %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={clientPct}
                        onChange={(e) => { const v = Number(e.target.value); setClientPct(v); setSquadPct(100 - v); }}
                        className="w-16 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-warning/40"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-text-secondary">Squad %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={squadPct}
                        onChange={(e) => { const v = Number(e.target.value); setSquadPct(v); setClientPct(100 - v); }}
                        className="w-16 rounded border border-border bg-bg-primary px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-warning/40"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleResolveDispute(d.id)}
                      disabled={resolving || !resolutionText.trim()}
                      className="px-4 py-2 bg-success text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                      {resolving ? 'Resolving...' : 'Resolve Dispute'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Client Satisfaction Rating — only for completed contracts */}
      {contract.status === 'completed' && (
        <div className="bg-white rounded-xl border border-border p-5 mb-6">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
            Client Satisfaction Rating
          </h2>

          {existingRating ? (
            <div className="space-y-3">
              <StarDisplay value={existingRating.overall} label="Overall" />
              <StarDisplay value={existingRating.quality} label="Quality" />
              <StarDisplay value={existingRating.communication} label="Communication" />
              <StarDisplay value={existingRating.timeliness} label="Timeliness" />
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm text-text-secondary">Would rehire?</span>
                <span className={`text-sm font-medium ${existingRating.wouldRehire ? 'text-success' : 'text-error'}`}>
                  {existingRating.wouldRehire ? 'Yes' : 'No'}
                </span>
              </div>
              {existingRating.feedback && (
                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-text-secondary mb-1">Feedback</p>
                  <p className="text-sm text-text-primary">{existingRating.feedback}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Overall</span>
                <StarSelector value={ratingOverall} onChange={setRatingOverall} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Quality</span>
                <StarSelector value={ratingQuality} onChange={setRatingQuality} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Communication</span>
                <StarSelector value={ratingComm} onChange={setRatingComm} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-text-secondary">Timeliness</span>
                <StarSelector value={ratingTimeliness} onChange={setRatingTimeliness} />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-sm text-text-secondary">Would rehire?</span>
                <button
                  type="button"
                  onClick={() => setWouldRehire(!wouldRehire)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    wouldRehire ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                  }`}
                >
                  {wouldRehire ? 'Yes' : 'No'}
                </button>
              </div>
              <textarea
                value={ratingFeedback}
                onChange={(e) => setRatingFeedback(e.target.value)}
                placeholder="Optional feedback for the squad..."
                rows={3}
                className="w-full border border-border rounded-lg p-3 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent-squad/30"
              />
              {ratingError && (
                <p className="text-sm text-error">{ratingError}</p>
              )}
              <button
                onClick={handleSubmitRating}
                disabled={submittingRating}
                className="px-5 py-2.5 bg-accent-squad text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigation tabs */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <nav className="flex gap-1 -mb-px">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className="px-4 py-2.5 text-sm font-medium text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-accent-squad/40 transition-colors whitespace-nowrap"
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Workstream summary cards */}
      <div className="space-y-4">
        {contract.workstreams.map((ws) => {
          const statusCounts: Record<string, number> = {};
          ws.deliverables.forEach((d) => {
            statusCounts[d.status] = (statusCounts[d.status] || 0) + 1;
          });
          const wsApproved = statusCounts['approved'] || 0;
          const wsTotal = ws.deliverables.length;

          return (
            <div key={ws.id} className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-text-primary">{ws.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full capitalize ${DELIVERABLE_STATUS_STYLES[ws.status]?.bg || 'bg-bg-secondary'}`}
                  >
                    {ws.status.replace('_', ' ')}
                  </span>
                </div>
                <span className="text-sm text-text-secondary">
                  {wsApproved}/{wsTotal} complete
                </span>
              </div>

              <div className="space-y-2">
                {ws.deliverables.map((d) => {
                  const isAgent = d.assignee.includes('(Agent)');
                  const statusInfo = DELIVERABLE_STATUS_STYLES[d.status] ?? { bg: 'bg-bg-secondary', label: d.status };

                  return (
                    <div
                      key={d.id}
                      className={`flex items-center gap-3 p-3 rounded-lg bg-bg-primary ${isAgent ? 'border-l-4 border-accent-agent' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-text-primary truncate block">
                          {d.title}
                        </span>
                        <span className="text-xs text-text-secondary">{d.assignee}</span>
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${d.format === 'codebase' ? 'bg-accent-agent/10 text-accent-agent' : d.format === 'design' ? 'bg-accent-client/10 text-accent-client' : 'bg-bg-secondary text-text-secondary'}`}>
                        {d.format}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
