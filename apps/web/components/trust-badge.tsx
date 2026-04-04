'use client';

interface TrustBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-amber-100 text-amber-700 border-amber-200';
  if (score >= 60) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 30) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Elite';
  if (score >= 60) return 'Trusted';
  if (score >= 30) return 'Verified';
  return 'New';
}

export function TrustBadge({ score, size = 'sm' }: TrustBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  if (size === 'md') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colorClass}`}
        title={`Trust Score: ${score}`}
      >
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
        </svg>
        {Math.round(score)} {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}
      title={`Trust Score: ${score}`}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
      </svg>
      {Math.round(score)}
    </span>
  );
}
