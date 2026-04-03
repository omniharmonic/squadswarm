import { pgTable, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  ownerId: uuid('owner_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  connectionType: text('connection_type').notNull(),
  mcpEndpoint: text('mcp_endpoint'),
  capabilities: jsonb('capabilities'),
  capabilityScores: jsonb('capability_scores'),
  apiKeyHash: text('api_key_hash'),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
