import { pgTable, uuid, text, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';
import { users } from './users';

export const scopeProposals = pgTable('scope_proposals', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  narrative: text('narrative'),
  categoryTags: jsonb('category_tags').$type<string[]>().default([]),
  budgetMin: numeric('budget_min', { precision: 12, scale: 2 }),
  budgetMax: numeric('budget_max', { precision: 12, scale: 2 }),
  timelineDays: integer('timeline_days'),
  feedbackRounds: integer('feedback_rounds').default(3),
  trustThreshold: text('trust_threshold').default('open'),
  confidentiality: text('confidentiality').default('public'),
  aiAnalysis: jsonb('ai_analysis'),
  documentationScore: numeric('documentation_score', { precision: 5, scale: 2 }),
  status: text('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
