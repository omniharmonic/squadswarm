/**
 * PageRank-based trust scoring integration.
 *
 * This module connects the TrustGraph PageRank algorithm to real
 * SquadSwarm data, computing trust scores from the attestation graph.
 *
 * The PageRank score is blended with the simple additive score:
 * - If enough attestation data exists (>= 3 edges): use PageRank (70%) + additive (30%)
 * - If insufficient data: use additive score only (100%)
 *
 * This progressive approach ensures new users get reasonable scores
 * while established users benefit from graph-based reputation.
 */

import { eq } from 'drizzle-orm';
import { db, contracts, activityLog } from '@squadswarm/db';
import { computeTrustScores, buildEdgesFromContracts, type TrustEdge } from '@squadswarm/web3';

// Platform-verified trusted seed accounts (would be configurable)
const TRUSTED_SEEDS: string[] = [];

/**
 * Compute PageRank-based trust score for a specific entity.
 * Returns null if insufficient data for graph computation.
 */
export async function computePageRankScore(entityId: string): Promise<{
  score: number;
  edgeCount: number;
} | null> {
  try {
    // Fetch all completed contracts
    const completedContracts = await db
      .select()
      .from(contracts)
      .where(eq(contracts.status, 'completed'));

    if (completedContracts.length < 2) {
      return null; // Not enough data for meaningful graph computation
    }

    // Build contract data with ratings
    const contractData = await Promise.all(
      completedContracts.map(async (c) => {
        // Find rating for this contract
        const ratingEntries = await db
          .select()
          .from(activityLog)
          .where(eq(activityLog.contractId, c.id));
        const ratingEntry = ratingEntries.find((r) => r.action === 'contract_rated');
        const ratingMeta = ratingEntry?.metadata as Record<string, number> | null;

        return {
          clientId: c.clientId,
          squadId: c.squadId,
          amount: Number(c.totalAmount),
          rating: ratingMeta?.overall,
          completedAt: c.completedAt ? new Date(c.completedAt).getTime() : undefined,
          disputed: c.status === 'completed' && ratingEntries.some((r) => r.action === 'contract_completed' && (r.metadata as Record<string, string>)?.resolution),
        };
      }),
    );

    // Build trust edges
    const edges = buildEdgesFromContracts(contractData);

    if (edges.length < 3) {
      return null; // Not enough edges for meaningful PageRank
    }

    // Compute PageRank scores
    const scores = computeTrustScores(edges, {
      trustedSeeds: TRUSTED_SEEDS,
      trustMultiplier: 3.0,
      recencyDecayMonths: 6,
    });

    // Find score for the requested entity
    const entityScore = scores.find((s) => s.entityId === entityId);

    return entityScore
      ? { score: entityScore.score, edgeCount: edges.length }
      : null;
  } catch (error) {
    console.error('[TrustGraph] PageRank computation error:', error);
    return null;
  }
}

/**
 * Blend PageRank score with simple additive score.
 * Returns the final blended score.
 */
export function blendTrustScores(
  additiveScore: number,
  pageRankScore: number | null,
  edgeCount: number,
): { finalScore: number; method: 'additive' | 'blended' | 'pagerank' } {
  if (pageRankScore === null || edgeCount < 3) {
    return { finalScore: additiveScore, method: 'additive' };
  }

  if (edgeCount < 10) {
    // Blend: more additive when fewer edges
    const prWeight = Math.min(edgeCount / 10, 0.5);
    const blended = Math.round(additiveScore * (1 - prWeight) + pageRankScore * prWeight);
    return { finalScore: Math.max(0, Math.min(blended, 100)), method: 'blended' };
  }

  // Sufficient data: PageRank dominant
  const blended = Math.round(additiveScore * 0.3 + pageRankScore * 0.7);
  return { finalScore: Math.max(0, Math.min(blended, 100)), method: 'pagerank' };
}
