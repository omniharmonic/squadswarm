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
} from './schemas';

export {
  createAttestation,
  createContractCompletionAttestation,
  createClientSatisfactionAttestation,
  createAgentCapabilityAttestation,
  createSkillVerificationAttestation,
} from './create-attestation';

export type { AttestationData, AttestationResult } from './create-attestation';
