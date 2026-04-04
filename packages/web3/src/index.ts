export { config } from './wagmi';
export { createSquadSafe } from './safe';
export {
  EAS_CONTRACT_ADDRESS,
  SCHEMA_REGISTRY_ADDRESS,
  CONTRACT_COMPLETION_SCHEMA,
  CLIENT_SATISFACTION_SCHEMA,
  AGENT_CAPABILITY_SCHEMA,
  SQUAD_MEMBERSHIP_SCHEMA,
  SKILL_VERIFICATION_SCHEMA,
  DISPUTE_RESOLUTION_SCHEMA,
  ALL_SCHEMAS,
  createAttestation,
  createContractCompletionAttestation,
  createClientSatisfactionAttestation,
  createAgentCapabilityAttestation,
  createSkillVerificationAttestation,
} from './eas';
export type { AttestationData, AttestationResult } from './eas';
export * from './escrow';
export { computeTrustScores, buildEdgesFromContracts } from './trust-graph';
export type { TrustEdge, TrustScore, TrustGraphConfig } from './trust-graph';
