import { pgTable, uuid, text, timestamp, jsonb, numeric, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { scopeProposals } from './scope-proposals';

export const scopes = pgTable('scopes', {
  id: uuid('id').primaryKey().defaultRandom(),
  proposalId: uuid('proposal_id').references(() => scopeProposals.id),
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
  workPlan: jsonb('work_plan'),
  biddingDeadline: timestamp('bidding_deadline'),
  status: text('status').default('open').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_scopes_status_deadline').on(table.status, table.biddingDeadline),
  index('idx_scopes_trust_threshold').on(table.trustThreshold),
]);
