import { pgTable, uuid, text, timestamp, jsonb, boolean } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { users } from './users';
import { squads } from './squads';
import { agents } from './agents';

export const attestations = pgTable('attestations', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').references(() => contracts.id),
  userId: uuid('user_id').references(() => users.id),
  squadId: uuid('squad_id').references(() => squads.id),
  agentId: uuid('agent_id').references(() => agents.id),
  type: text('type').notNull(), // contract_completion, client_satisfaction, agent_capability, skill_verification
  easUid: text('eas_uid'), // on-chain attestation UID (null if off-chain)
  schemaUid: text('schema_uid'),
  data: jsonb('data'), // attestation payload
  onChain: boolean('on_chain').default(false).notNull(),
  chainId: text('chain_id'), // e.g., '8453' for Base
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
