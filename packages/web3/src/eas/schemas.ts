// EAS Schema definitions for SquadSwarm attestations
// These would be registered on EAS (Base Sepolia for testnet, Base for mainnet)

export const EAS_CONTRACT_ADDRESS = '0x4200000000000000000000000000000000000021'; // Base EAS

export const SCHEMA_REGISTRY_ADDRESS = '0x4200000000000000000000000000000000000020'; // Base

// Schema 1: Contract Completion
export const CONTRACT_COMPLETION_SCHEMA = {
  name: 'SquadSwarm Contract Completion',
  schema: 'bytes32 contractId, address squad, address client, uint256 amount, uint256 duration, uint8 rating',
  description: 'Attests that a squad completed a contract successfully',
  // Schema UID would be set after registration
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// Schema 2: Client Satisfaction
export const CLIENT_SATISFACTION_SCHEMA = {
  name: 'SquadSwarm Client Satisfaction',
  schema: 'bytes32 contractId, address squad, uint8 overall, uint8 quality, uint8 communication, uint8 timeliness, bool wouldRehire',
  description: 'Client satisfaction rating for a completed contract',
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// Schema 3: Agent Capability
export const AGENT_CAPABILITY_SCHEMA = {
  name: 'SquadSwarm Agent Capability',
  schema: 'bytes32 agentId, bytes32 contractId, string[] capabilities, uint256 hoursWorked, uint8 rating',
  description: 'Attests an AI agent contributed to a contract with specific capabilities',
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// Schema 4: Squad Membership
export const SQUAD_MEMBERSHIP_SCHEMA = {
  name: 'SquadSwarm Squad Membership',
  schema: 'bytes32 squadId, address member, string role, uint256 joinedAt',
  description: 'Attests a member belongs to a squad',
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// Schema 5: Skill Verification
export const SKILL_VERIFICATION_SCHEMA = {
  name: 'SquadSwarm Skill Verification',
  schema: 'address member, string skill, uint8 proficiency, bytes32 evidenceContractId',
  description: 'Verifies a member demonstrated a skill through contract completion',
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

// Schema 6: Dispute Resolution
export const DISPUTE_RESOLUTION_SCHEMA = {
  name: 'SquadSwarm Dispute Resolution',
  schema: 'bytes32 contractId, bytes32 disputeId, uint256 clientAmount, uint256 squadAmount, string resolution',
  description: 'Records the outcome of a contract dispute',
  uid: '0x0000000000000000000000000000000000000000000000000000000000000000',
};

export const ALL_SCHEMAS = [
  CONTRACT_COMPLETION_SCHEMA,
  CLIENT_SATISFACTION_SCHEMA,
  AGENT_CAPABILITY_SCHEMA,
  SQUAD_MEMBERSHIP_SCHEMA,
  SKILL_VERIFICATION_SCHEMA,
  DISPUTE_RESOLUTION_SCHEMA,
];
