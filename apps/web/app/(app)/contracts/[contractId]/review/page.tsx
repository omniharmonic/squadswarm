'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

const REVIEW_ITEMS = [
  {
    id: 'd-4',
    title: 'Dashboard UI Components',
    format: 'codebase',
    assignee: 'Amara Osei',
    isAgent: false,
    workstream: 'Frontend Dashboard',
    submittedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    criteria: [
      { id: 'c1', text: 'All core dashboard widgets render correctly', checked: false },
      { id: 'c2', text: 'Responsive across desktop and tablet breakpoints', checked: false },
      { id: 'c3', text: 'Matches approved design mockups', checked: false },
      { id: 'c4', text: 'Accessibility: keyboard navigation and screen reader support', checked: false },
    ],
  },
];

const FEEDBACK_ROUND = 1;
const FEEDBACK_TOTAL = 3;

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('');
}

function formatTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function ClientReviewPage() {
  const params = useParams();
  const contractId = params.contractId as string;

  const [items, setItems] = useState(REVIEW_ITEMS);
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());

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

  const handleApprove = (itemId: string) => {
    setReviewedIds((prev) => new Set(prev).add(itemId));
  };

  const handleRequestRevision = (itemId: string) => {
    setReviewedIds((prev) => new Set(prev).add(itemId));
  };

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Client Review</h1>
            <p className="text-text-secondary text-sm mt-1">
              <Link href={`/contracts/${contractId}`} className="hover:text-accent-squad transition-colors">
                Regenerative Finance Dashboard
              </Link>
            </p>
          </div>
          <div className="bg-white rounded-lg border border-border px-4 py-2">
            <span className="text-sm text-text-secondary">
              Round{' '}
              <span className="font-semibold text-text-primary">{FEEDBACK_ROUND}</span>
              {' '}of{' '}
              <span className="font-semibold text-text-primary">{FEEDBACK_TOTAL}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Review items */}
      {items.length === 0 && (
        <div className="bg-white rounded-xl border border-border p-12 text-center">
          <p className="text-text-secondary">No deliverables awaiting review.</p>
        </div>
      )}

      <div className="space-y-6">
        {items.map((item) => {
          const isReviewed = reviewedIds.has(item.id);
          const allChecked = item.criteria.every((c) => c.checked);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-xl border border-border overflow-hidden ${isReviewed ? 'opacity-60' : ''}`}
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
                        <span>{item.assignee}</span>
                      </div>
                      <span className="text-border">|</span>
                      <span>{item.workstream}</span>
                      <span className="text-border">|</span>
                      <span>Submitted {formatTime(item.submittedAt)}</span>
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

              {/* Acceptance criteria checklist */}
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

              {/* Actions */}
              {!isReviewed && (
                <div className="px-5 pb-5 flex items-center gap-3">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={!allChecked}
                    className="px-5 py-2.5 bg-success text-white text-sm font-medium rounded-lg hover:bg-success/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRequestRevision(item.id)}
                    className="px-5 py-2.5 bg-white border border-warning text-warning text-sm font-medium rounded-lg hover:bg-warning/5 transition-colors"
                  >
                    Request Revision
                  </button>
                  {!allChecked && (
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
