/**
 * TrustGraph — PageRank-based trust scoring following the Lay3rLabs/TrustGraph pattern.
 *
 * Trust flows through attestation edges in a directed graph.
 * Trusted seeds (platform-verified accounts) get multiplied edge weights
 * to resist Sybil attacks.
 */

export interface TrustEdge {
  from: string; // attester address or userId
  to: string; // recipient address or userId
  weight: number; // edge weight from attestation
  type: string; // attestation type
  timestamp: number; // when the attestation was created
}

export interface TrustScore {
  entityId: string;
  score: number; // 0-100 normalized
  rawScore: number; // raw PageRank value
  attestationCount: number;
  lastUpdated: number;
}

export interface TrustGraphConfig {
  dampingFactor: number; // default 0.85
  maxIterations: number; // default 100
  convergenceTolerance: number; // default 1e-6
  minimumThreshold: number; // default 0.0001
  trustMultiplier: number; // 2-5x for trusted seeds
  recencyDecayMonths: number; // after this many months, attestation weight halves
  trustedSeeds: string[]; // platform-verified entity IDs
}

const DEFAULT_CONFIG: TrustGraphConfig = {
  dampingFactor: 0.85,
  maxIterations: 100,
  convergenceTolerance: 1e-6,
  minimumThreshold: 0.0001,
  trustMultiplier: 3.0,
  recencyDecayMonths: 6,
  trustedSeeds: [],
};

/**
 * Compute trust scores using modified PageRank.
 *
 * The algorithm:
 * 1. Build a directed graph from attestation edges
 * 2. Apply recency decay to edge weights
 * 3. Apply trust multiplier for edges from trusted seeds
 * 4. Run PageRank until convergence
 * 5. Normalize scores to 0-100
 */
export function computeTrustScores(
  edges: TrustEdge[],
  config: Partial<TrustGraphConfig> = {},
): TrustScore[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const now = Date.now();

  // Collect all unique entities
  const entities = new Set<string>();
  for (const edge of edges) {
    entities.add(edge.from);
    entities.add(edge.to);
  }
  const entityList = Array.from(entities);
  const N = entityList.length;
  if (N === 0) return [];

  const entityIndex = new Map<string, number>();
  entityList.forEach((e, i) => entityIndex.set(e, i));

  // Build adjacency with weights
  const outWeights: number[][] = Array.from({ length: N }, () => Array(N).fill(0));
  const outDegree: number[] = Array(N).fill(0);
  const attestationCounts: number[] = Array(N).fill(0);

  for (const edge of edges) {
    const fromIdx = entityIndex.get(edge.from)!;
    const toIdx = entityIndex.get(edge.to)!;

    // Recency decay
    const ageMonths = (now - edge.timestamp) / (30 * 24 * 60 * 60 * 1000);
    const decay = ageMonths > cfg.recencyDecayMonths ? 0.5 : 1.0;

    // Trust multiplier for seeds
    const seedBoost = cfg.trustedSeeds.includes(edge.from) ? cfg.trustMultiplier : 1.0;

    const weight = edge.weight * decay * seedBoost;
    outWeights[fromIdx]![toIdx]! += weight;
    outDegree[fromIdx]! += weight;
    attestationCounts[toIdx]!++;
  }

  // Initialize PageRank scores
  let scores = Array(N).fill(1 / N);

  // Give trusted seeds a boost in initial distribution
  if (cfg.trustedSeeds.length > 0) {
    const seedShare = 0.1; // 10% of initial mass to seeds
    const seedCount = cfg.trustedSeeds.filter((s) => entityIndex.has(s)).length;
    if (seedCount > 0) {
      const seedBoost = seedShare / seedCount;
      const regularShare = (1 - seedShare) / N;
      scores = entityList.map((e) =>
        cfg.trustedSeeds.includes(e) ? regularShare + seedBoost : regularShare,
      );
    }
  }

  // PageRank iterations
  for (let iter = 0; iter < cfg.maxIterations; iter++) {
    const newScores = Array(N).fill((1 - cfg.dampingFactor) / N);
    let maxDelta = 0;

    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (outWeights[j]![i]! > 0 && outDegree[j]! > 0) {
          newScores[i] += cfg.dampingFactor * (scores[j]! * outWeights[j]![i]! / outDegree[j]!);
        }
      }
      maxDelta = Math.max(maxDelta, Math.abs(newScores[i]! - scores[i]!));
    }

    scores = newScores;

    if (maxDelta < cfg.convergenceTolerance) {
      break;
    }
  }

  // Normalize to 0-100
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores.filter((s) => s > cfg.minimumThreshold));

  return entityList.map((entity, i) => ({
    entityId: entity,
    score: maxScore > 0 ? Math.round((scores[i]! / maxScore) * 100) : 0,
    rawScore: scores[i]!,
    attestationCount: attestationCounts[i]!,
    lastUpdated: now,
  }));
}

/**
 * Build trust edges from SquadSwarm contract data.
 */
export function buildEdgesFromContracts(contracts: Array<{
  clientId: string;
  squadId: string;
  amount: number;
  rating?: number;
  completedAt?: number;
  disputed?: boolean;
}>): TrustEdge[] {
  const edges: TrustEdge[] = [];

  for (const contract of contracts) {
    const timestamp = contract.completedAt || Date.now();
    const baseWeight = Math.min(contract.amount / 10000, 10); // cap at 10

    // Client → Squad attestation (contract completion)
    edges.push({
      from: contract.clientId,
      to: contract.squadId,
      weight: baseWeight * (contract.rating ? contract.rating / 5 : 0.5),
      type: 'contract_completion',
      timestamp,
    });

    // Squad → Client attestation (reverse — squad trusts client)
    edges.push({
      from: contract.squadId,
      to: contract.clientId,
      weight: baseWeight * 0.5, // lower weight for reverse
      type: 'contract_completion_reverse',
      timestamp,
    });

    // Dispute penalty
    if (contract.disputed) {
      edges.push({
        from: contract.clientId,
        to: contract.squadId,
        weight: -baseWeight * 0.3,
        type: 'dispute',
        timestamp,
      });
    }
  }

  return edges;
}
