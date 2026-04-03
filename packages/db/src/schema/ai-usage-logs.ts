import { pgTable, uuid, text, timestamp, integer, numeric } from 'drizzle-orm/pg-core';

export const aiUsageLogs = pgTable('ai_usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  model: text('model').notNull(),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  estimatedCost: numeric('estimated_cost', { precision: 8, scale: 4 }),
  purpose: text('purpose'),
  entityId: uuid('entity_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
