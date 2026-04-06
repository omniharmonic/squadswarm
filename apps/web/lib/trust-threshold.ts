/**
 * Trust threshold configuration and enforcement logic.
 * Used by both API routes (to gate bid creation) and UI (to display threshold status).
 */

export const TRUST_THRESHOLDS: Record<string, { minScore: number; label: string; description: string }> = {
  open: { minScore: 0, label: 'Open', description: 'Anyone can bid' },
  verified: { minScore: 25, label: 'Verified', description: 'Requires basic track record (trust score >= 25)' },
  trusted: { minScore: 50, label: 'Trusted', description: 'Requires established reputation (trust score >= 50)' },
  elite: { minScore: 75, label: 'Elite', description: 'Requires top-tier reputation (trust score >= 75)' },
};

const DEFAULT_THRESHOLD = TRUST_THRESHOLDS.open!;

export function meetsThreshold(squadTrustScore: number, threshold: string): boolean {
  const config = TRUST_THRESHOLDS[threshold] ?? DEFAULT_THRESHOLD;
  return squadTrustScore >= config.minScore;
}

export function getThresholdGap(squadTrustScore: number, threshold: string): {
  meets: boolean;
  gap: number;
  required: number;
} {
  const config = TRUST_THRESHOLDS[threshold] ?? DEFAULT_THRESHOLD;
  return {
    meets: squadTrustScore >= config.minScore,
    gap: Math.max(0, config.minScore - squadTrustScore),
    required: config.minScore,
  };
}

export function getAllThresholdStatuses(squadTrustScore: number): Record<string, { meets: boolean; required: number; gap?: number }> {
  const statuses: Record<string, { meets: boolean; required: number; gap?: number }> = {};
  for (const [key, config] of Object.entries(TRUST_THRESHOLDS)) {
    const meets = squadTrustScore >= config.minScore;
    statuses[key] = {
      meets,
      required: config.minScore,
      ...(meets ? {} : { gap: config.minScore - squadTrustScore }),
    };
  }
  return statuses;
}
