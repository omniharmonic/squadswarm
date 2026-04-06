'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface OnboardingChecklistProps {
  hasSquad: boolean;
  hasProposal: boolean;
  hasBid: boolean;
  hasContract: boolean;
}

const STORAGE_KEY = 'squadswarm-onboarding-dismissed';

const steps = [
  {
    title: 'Create your first squad',
    description: 'Form a cooperative team to take on work together.',
    href: '/squads/new',
    key: 'hasSquad' as const,
  },
  {
    title: 'Browse open scopes',
    description: 'Explore available projects looking for squads.',
    href: '/scopes',
    key: null,
  },
  {
    title: 'Submit a scope proposal',
    description: 'Post a project scope for squads to bid on.',
    href: '/scopes/new',
    key: 'hasProposal' as const,
  },
  {
    title: 'Place your first bid',
    description: 'Bid on a scope with your squad to win work.',
    href: '/scopes',
    key: 'hasBid' as const,
  },
];

export function OnboardingChecklist({
  hasSquad,
  hasProposal,
  hasBid,
  hasContract,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setDismissed(stored === 'true');
  }, []);

  if (dismissed) return null;

  const completionMap: Record<string, boolean> = {
    hasSquad,
    hasProposal,
    hasBid,
    hasContract,
  };

  const completedCount = steps.filter(
    (s) => s.key === null || completionMap[s.key]
  ).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  }

  return (
    <div className="bg-white rounded-2xl border border-border p-6 mb-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary">Getting Started</h2>
        <button
          onClick={handleDismiss}
          className="text-text-muted hover:text-text-secondary transition-colors p-1 -mr-1"
          aria-label="Dismiss onboarding checklist"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-text-secondary">{completedCount} of {steps.length} complete</span>
          <span className="text-xs font-medium text-accent-squad">{progressPercent}%</span>
        </div>
        <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-accent-squad rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step) => {
          const isComplete = step.key === null ? false : completionMap[step.key];

          return (
            <Link
              key={step.title}
              href={step.href}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-bg-secondary transition-colors group"
            >
              {/* Checkbox circle */}
              <div className="mt-0.5 shrink-0">
                {isComplete ? (
                  <div className="w-5 h-5 rounded-full bg-accent-squad flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border group-hover:border-accent-squad/40 transition-colors" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <span className={`text-sm font-medium ${isComplete ? 'text-text-muted line-through' : 'text-text-primary'}`}>
                  {step.title}
                </span>
                <p className={`text-xs mt-0.5 ${isComplete ? 'text-text-muted' : 'text-text-secondary'}`}>
                  {step.description}
                </p>
              </div>

              {/* Arrow */}
              {!isComplete && (
                <svg className="w-4 h-4 text-text-muted mt-0.5 shrink-0 group-hover:text-accent-squad transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
