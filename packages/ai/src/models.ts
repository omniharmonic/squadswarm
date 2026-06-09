/**
 * Central registry of model IDs by task. Keeping these in one place means a
 * model upgrade is a one-line change and every call site stays consistent.
 *
 * The Scope Analyst is the most reasoning-heavy task in the product (work
 * decomposition), so it uses an Opus-class model per the PRD (§8.4). High-volume
 * structured extraction uses a cheaper, fast model.
 *
 * Override per-deployment via env without code changes.
 */
export const MODELS = {
  // High-capability default for work decomposition. Sonnet 4.6 is current and
  // cost-sensible per-scope; set SCOPE_ANALYST_MODEL=claude-opus-4-8 for maximum
  // quality (PRD §8.4 calls for Opus-class).
  scopeAnalyst: process.env.SCOPE_ANALYST_MODEL || 'claude-sonnet-4-6',
  // High-volume, simple structured extraction — fast + cheap.
  skillExtract: process.env.SKILL_EXTRACT_MODEL || 'claude-haiku-4-5-20251001',
} as const;

export type ModelTask = keyof typeof MODELS;
