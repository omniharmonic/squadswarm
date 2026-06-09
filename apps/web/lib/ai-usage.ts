import { db, aiUsageLogs } from '@squadswarm/db';

/**
 * Rough USD cost per 1M tokens, used only for an at-a-glance spend estimate in
 * `ai_usage_logs`. Not billing-grade — refine as pricing changes. Unknown
 * models fall back to a conservative estimate.
 */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-4-8': { input: 15, output: 75 },
  'claude-opus-4-20250514': { input: 15, output: 75 },
  'claude-sonnet-4-6': { input: 3, output: 15 },
  'claude-haiku-4-5-20251001': { input: 1, output: 5 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? { input: 5, output: 15 };
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

/**
 * Record one model call. Best-effort: a logging failure must never break the
 * request that produced the work, so errors are swallowed (and logged).
 */
export async function logAiUsage(params: {
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  purpose: string;
  entityId?: string;
}): Promise<void> {
  try {
    const inputTokens = params.inputTokens ?? 0;
    const outputTokens = params.outputTokens ?? 0;
    await db.insert(aiUsageLogs).values({
      model: params.model,
      inputTokens,
      outputTokens,
      estimatedCost: estimateCost(params.model, inputTokens, outputTokens).toFixed(4),
      purpose: params.purpose,
      entityId: params.entityId,
    });
  } catch (err) {
    console.error('[ai-usage] failed to record usage', err);
  }
}
