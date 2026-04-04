'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Criterion {
  id: string;
  text: string;
  checked: boolean;
}

interface ReviewItem {
  id: string;
  title: string;
  description?: string;
  format: string;
  assignee: string;
  isAgent: boolean;
  workstream: string;
  criteria: Criterion[];
}

function getInitials(name: string) {
  return name
    .replace(/\s*\(Agent\)/, '')
    .split(' ')
    .map((n) => n[0])
    .join('');
}

export default function ClientReviewPage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [contractTitle, setContractTitle] = useState('');
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [actioningId, setActioningId] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${contractId}/deliverables`);
      if (!res.ok) return;
      const data = await res.json();

      // Flatten workstreams and filter to in_review only
      const reviewItems: ReviewItem[] = [];
      for (const ws of data) {
        for (const d of ws.deliverables) {
          if (d.status !== 'in_review') continue;

          // Parse acceptance criteria from the deliverable
          const rawCriteria = d.acceptanceCriteria;
          let criteria: Criterion[] = [];
          if (Array.isArray(rawCriteria)) {
            criteria = rawCriteria.map((c: { text?: string; id?: string }, i: number) => ({
              id: `c-${d.id}-${i}`,
              text: typeof c === 'string' ? c : c.text || String(c),
              checked: false,
            }));
          }

          reviewItems.push({
            id: d.id,
            title: d.title,
            description: d.description,
            format: d.format,
            assignee: d.assignee || 'Unassigned',
            isAgent: (d.assignee || '').includes('(Agent)'),
            workstream: ws.title,
            criteria,
          });
        }
      }

      setItems(reviewItems);

      // Also fetch contract title
      const contractRes = await fetch(`/api/contracts/${contractId}`);
      if (contractRes.ok) {
        const contractData = await contractRes.json();
        setContractTitle(contractData.title);
      }
    } catch {
      // Leave empty on failure
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  useEffect(() => {
    fetchDeliverables();
  }, [fetchDeliverables]);

  const toggleCriterion = (itemId: string, criterionId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              criteria: item.criteria.map((c) =>
                c.id === criterionId ? { ...c, checked: !c.checked } : c
              ),
            }
          : item
      )
    );
  };

  const handleApprove = async (itemId: string) => {
    setActioningId(itemId);
    try {
      const res = await fetch(`/api/deliverables/${itemId}/approve`, {
        method: 'POST',
      });
      if (res.ok) {
        setReviewedIds((prev) => new Set(prev).add(itemId));
        // Remove from list after a short delay so the user sees the feedback
        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== itemId));
          setReviewedIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, 1500);
      }
    } catch {
      // Silently fail
    } finally {
      setActioningId(null);
    }
  };

  const handleRequestRevision = async (itemId: string) => {
    setActioningId(itemId);
    try {
      const res = await fetch(`/api/deliverables/${itemId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'revision_requested' }),
      });
      if (res.ok) {
        setReviewedIds((prev) => new Set(prev).add(itemId));
        setTimeout(() => {
          setItems((prev) => prev.filter((item) => item.id !== itemId));
          setReviewedIds((prev) => {
            const next = new Set(prev);
            next.delete(itemId);
            return next;
          });
        }, 1500);
      }
    } catch {
      // Silently fail
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-accent-squad border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Client Review</h1>
            <p className="text-text-secondary text-sm mt-1">
              <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
                {contractTitle || 'Contract'}
              </Link>
            </p>
          </div>
          <div className="bg-white rounded-lg border border-border px-4 py-2">
            <span className="text-sm text-text-secondary">
              <span className="font-semibold text-text-primary">{items.length}</span>
              {' '}deliverable{items.length !== 1 ? 's' : ''} awaiting review
            </span>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <h3 className="text-lg font-semibold mb-2">All caught up</h3>
          <p className="text-text-secondary text-sm">No deliverables are currently awaiting your review.</p>
          <Link
            href={`/contracts/${contractId}/board`}
            className="text-accent-squad hover:underline text-sm mt-3 inline-block"
          >
            View Kanban Board
          </Link>
        </div>
      )}

      {/* Review items */}
      <div className="space-y-6">
        {items.map((item) => {
          const isReviewed = reviewedIds.has(item.id);
          const allChecked = item.criteria.length === 0 || item.criteria.every((c) => c.checked);
          const isActioning = actioningId === item.id;

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border border-border overflow-hidden ${isReviewed ? 'opacity-60' : ''} ${isActioning ? 'opacity-70' : ''}`}
            >
              {/* Item header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm text-text-secondary">
                      <div className="flex items-center gap-1.5">
                        {item.isAgent ? (
                          <div className="w-5 h-5 bg-accent-agent/10 border border-accent-agent/30 rounded-sm rotate-45 flex items-center justify-center">
                            <span className="text-[8px] font-bold text-accent-agent -rotate-45">
                              {getInitials(item.assignee)}
                            </span>
                          </div>
                        ) : (
                          <div className="w-5 h-5 bg-bg-secondary rounded-full flex items-center justify-center">
                            <span className="text-[8px] font-bold text-text-secondary">
                              {getInitials(item.assignee)}
                            </span>
                          </div>
                        )}
                        <span>{item.assignee.replace(' (Agent)', '')}</span>
                      </div>
                      <span className="text-border">|</span>
                      <span>{item.workstream}</span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                      item.format === 'codebase'
                        ? 'bg-accent-agent/10 text-accent-agent'
                        : item.format === 'design'
                        ? 'bg-accent-client/10 text-accent-client'
                        : 'bg-bg-secondary text-text-secondary'
                    }`}
                  >
                    {item.format}
                  </span>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div className="px-5 pt-4">
                  <p className="text-sm text-text-secondary">{item.description}</p>
                </div>
              )}

              {/* Acceptance criteria checklist */}
              {item.criteria.length > 0 && (
                <div className="p-5">
                  <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-3">
                    Acceptance Criteria
                  </h4>
                  <div className="space-y-2.5">
                    {item.criteria.map((c) => (
                      <label
                        key={c.id}
                        className="flex items-start gap-3 cursor-pointer group"
                      >
                        <input
                          type="checkbox"
                          checked={c.checked}
                          onChange={() => toggleCriterion(item.id, c.id)}
                          disabled={isReviewed}
                          className="mt-0.5 h-4 w-4 rounded border-border text-success focus:ring-success/30"
                        />
                        <span
                          className={`text-sm ${
                            c.checked
                              ? 'text-text-secondary line-through'
                              : 'text-text-primary'
                          } group-hover:text-text-primary transition-colors`}
                        >
                          {c.text}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {item.criteria.length === 0 && (
                <div className="px-5 pt-4 pb-2">
                  <p className="text-xs text-text-secondary italic">No acceptance criteria defined for this deliverable.</p>
                </div>
              )}

              {/* Actions */}
              {!isReviewed && (
                <div className="px-5 pb-5 flex items-center gap-3">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={!allChecked || isActioning}
                    className="px-5 py-2.5 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isActioning ? 'Approving...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => handleRequestRevision(item.id)}
                    disabled={isActioning}
                    className="px-5 py-2.5 bg-white border border-warning text-warning text-sm font-medium rounded-lg hover:bg-warning/5 transition-colors disabled:opacity-50"
                  >
                    Request Revision
                  </button>
                  {!allChecked && item.criteria.length > 0 && (
                    <span className="text-xs text-text-secondary">
                      Check all criteria to approve
                    </span>
                  )}
                </div>
              )}

              {isReviewed && (
                <div className="px-5 pb-5">
                  <span className="text-sm font-medium text-success">Review submitted</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
