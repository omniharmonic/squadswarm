import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { users } from './users';
import { agents } from './agents';

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  actorAgentId: uuid('actor_agent_id').references(() => agents.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: uuid('entity_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_activity_log_contract_created').on(table.contractId, table.createdAt),
]);
