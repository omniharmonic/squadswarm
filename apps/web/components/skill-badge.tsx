'use client';

interface SkillBadgeProps {
  name: string;
  category?: string;
  proficiencyLevel?: 'demonstrated' | 'proficient' | 'expert';
  attestationCount?: number;
  size?: 'sm' | 'md';
  showProficiency?: boolean;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  frontend:   { bg: 'bg-accent-agent/10', text: 'text-accent-agent', border: 'border-accent-agent/20' },
  backend:    { bg: 'bg-accent-squad/10', text: 'text-accent-squad', border: 'border-accent-squad/20' },
  design:     { bg: 'bg-[#8B5CF6]/10', text: 'text-[#8B5CF6]', border: 'border-[#8B5CF6]/20' },
  data:       { bg: 'bg-[#3B82F6]/10', text: 'text-[#3B82F6]', border: 'border-[#3B82F6]/20' },
  devops:     { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  ai_ml:      { bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', border: 'border-[#10B981]/20' },
  blockchain: { bg: 'bg-accent-client/10', text: 'text-accent-client', border: 'border-accent-client/20' },
  business:   { bg: 'bg-[#64748B]/10', text: 'text-[#64748B]', border: 'border-[#64748B]/20' },
  writing:    { bg: 'bg-[#EC4899]/10', text: 'text-[#EC4899]', border: 'border-[#EC4899]/20' },
  other:      { bg: 'bg-bg-secondary', text: 'text-text-muted', border: 'border-border' },
};

const DEFAULT_COLORS = CATEGORY_COLORS.other!;

function getCategoryColors(category?: string): { bg: string; text: string; border: string } {
  if (!category) return DEFAULT_COLORS;
  return CATEGORY_COLORS[category.toLowerCase()] ?? DEFAULT_COLORS;
}

const PROFICIENCY_DOTS: Record<string, number> = {
  demonstrated: 1,
  proficient: 2,
  expert: 3,
};

function ProficiencyRings({ level, colorClass }: { level: string; colorClass: string }) {
  const filled = PROFICIENCY_DOTS[level] ?? 0;
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full border ${
            i <= filled
              ? `${colorClass} border-current`
              : 'border-border bg-transparent'
          }`}
          style={i <= filled ? { backgroundColor: 'currentColor' } : undefined}
        />
      ))}
    </div>
  );
}

export function SkillBadge({
  name,
  category,
  proficiencyLevel,
  attestationCount,
  size = 'sm',
  showProficiency = true,
}: SkillBadgeProps) {
  const colors = getCategoryColors(category);

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
      >
        {name}
      </span>
    );
  }

  // Size md — card-like badge
  return (
    <div
      className={`inline-flex flex-col gap-1.5 px-4 py-3 rounded-xl border ${colors.bg} ${colors.border}`}
    >
      <div className="flex items-center gap-2">
        <span className={`text-sm font-semibold ${colors.text}`}>{name}</span>
        {category && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors.bg} ${colors.text} font-medium`}>
            {category.replace(/_/g, ' ')}
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {showProficiency && proficiencyLevel && (
          <div className="flex items-center gap-1.5">
            <ProficiencyRings level={proficiencyLevel} colorClass={colors.text} />
            <span className="text-[10px] text-text-secondary capitalize">{proficiencyLevel}</span>
          </div>
        )}
        {attestationCount != null && (
          <span className="text-[10px] text-text-secondary">
            {attestationCount} attestation{attestationCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>
    </div>
  );
}
