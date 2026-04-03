import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { users } from './users';

export const disputes = pgTable('disputes', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  raisedById: uuid('raised_by_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  evidence: jsonb('evidence'),
  proposedResolution: jsonb('proposed_resolution'),
  resolution: jsonb('resolution'),
  status: text('status').default('raised').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
