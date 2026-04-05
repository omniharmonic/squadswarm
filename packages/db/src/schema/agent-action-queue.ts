import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { agents } from './agents';
import { users } from './users';

export const agentActionQueue = pgTable('agent_action_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  agentId: uuid('agent_id').notNull().references(() => agents.id),
  actionType: text('action_type').notNull(), // 'submit_deliverable' | 'upload_file' | 'propose_approach'
  actionPayload: jsonb('action_payload').notNull(),
  status: text('status').default('pending').notNull(), // 'pending' | 'approved' | 'rejected'
  reviewedBy: uuid('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNote: text('review_note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_agent_queue_contract_status').on(table.contractId, table.status),
  index('idx_agent_queue_agent').on(table.agentId),
]);
