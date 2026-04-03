import { pgTable, uuid, text, timestamp, jsonb, numeric, integer } from 'drizzle-orm/pg-core';
import { scopes } from './scopes';
import { squads } from './squads';
import { bids } from './bids';
import { users } from './users';

export const contracts = pgTable('contracts', {
  id: uuid('id').primaryKey().defaultRandom(),
  scopeId: uuid('scope_id').notNull().references(() => scopes.id),
  bidId: uuid('bid_id').notNull().references(() => bids.id),
  clientId: uuid('client_id').notNull().references(() => users.id),
  squadId: uuid('squad_id').notNull().references(() => squads.id),
  title: text('title').notNull(),
  finalizedWorkPlan: jsonb('finalized_work_plan').notNull(),
  roleAssignments: jsonb('role_assignments').notNull(),
  paymentSchedule: jsonb('payment_schedule').notNull(),
  totalAmount: numeric('total_amount', { precision: 12, scale: 2 }).notNull(),
  feedbackRoundsTotal: integer('feedback_rounds_total').default(3),
  feedbackRoundsUsed: integer('feedback_rounds_used').default(0),
  disputeSplit: jsonb('dispute_split'),
  smartContractAddress: text('smart_contract_address'),
  status: text('status').default('pending_deposit').notNull(),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
