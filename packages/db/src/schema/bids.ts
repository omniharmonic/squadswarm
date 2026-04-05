import { pgTable, uuid, text, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';
import { scopes } from './scopes';
import { squads } from './squads';
import { users } from './users';

export const bids = pgTable('bids', {
  id: uuid('id').primaryKey().defaultRandom(),
  scopeId: uuid('scope_id').notNull().references(() => scopes.id),
  squadId: uuid('squad_id').notNull().references(() => squads.id),
  createdById: uuid('created_by_id').notNull().references(() => users.id),
  approach: text('approach'),
  roleAssignments: jsonb('role_assignments'),
  proposedTimeline: jsonb('proposed_timeline'),
  proposedPrice: numeric('proposed_price', { precision: 12, scale: 2 }),
  workPlanModifications: jsonb('work_plan_modifications'),
  paymentSchedule: jsonb('payment_schedule'),
  trackRecord: jsonb('track_record'),
  governanceStatus: text('governance_status'),
  governanceVotes: jsonb('governance_votes'),
  treasuryShareBps: integer('treasury_share_bps').default(2000), // basis points for squad treasury
  governanceDeadline: timestamp('governance_deadline'),
  submittedById: uuid('submitted_by_id').references(() => users.id),
  ratifiedAt: timestamp('ratified_at'),
  status: text('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
