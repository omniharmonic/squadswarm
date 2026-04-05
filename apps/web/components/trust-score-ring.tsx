'use client';

interface TrustScoreRingProps {
  score: number; // 0-100
  size?: 'sm' | 'md' | 'lg'; // sm=40px, md=80px, lg=120px
  showLabel?: boolean;
  label?: string;
  colorByThreshold?: boolean; // color changes based on threshold tier
}

const SIZES = {
  sm: { px: 40, stroke: 4, fontSize: 'text-xs', labelSize: 'text-[8px]' },
  md: { px: 80, stroke: 6, fontSize: 'text-lg', labelSize: 'text-[10px]' },
  lg: { px: 120, stroke: 8, fontSize: 'text-3xl', labelSize: 'text-xs' },
};

function getScoreColor(score: number): string {
  if (score >= 75) return '#C49A3C'; // accent-client (gold)
  if (score >= 50) return '#bb6b44'; // accent-squad (terracotta)
  if (score >= 25) return '#4e8c88'; // accent-agent (teal)
  return '#9C9A95'; // text-muted (gray)
}

function getScoreColorClass(score: number): string {
  if (score >= 75) return 'text-accent-client';
  if (score >= 50) return 'text-accent-squad';
  if (score >= 25) return 'text-accent-agent';
  return 'text-text-muted';
}

export function TrustScoreRing({
  score,
  size = 'md',
  showLabel = false,
  label,
  colorByThreshold = true,
}: TrustScoreRingProps) {
  const config = SIZES[size];
  const radius = (config.px - config.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(score, 100) / 100) * circumference;
  const center = config.px / 2;

  const strokeColor = colorByThreshold ? getScoreColor(score) : '#bb6b44';
  const textColorClass = colorByThreshold ? getScoreColorClass(score) : 'text-accent-squad';

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: config.px, height: config.px }}>
        <svg
          className="w-full h-full -rotate-90"
          viewBox={`0 0 ${config.px} ${config.px}`}
        >
          {/* Background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={config.stroke}
            className="text-border-light"
          />
          {/* Progress ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={strokeColor}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-bold ${textColorClass} ${config.fontSize}`}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {showLabel && label && (
        <span className={`mt-1 text-text-secondary ${config.labelSize}`}>
          {label}
        </span>
      )}
    </div>
  );
}
