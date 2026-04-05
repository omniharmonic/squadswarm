import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { bids } from './bids';
import { users } from './users';
import { agents } from './agents';

export const bidAssignments = pgTable('bid_assignments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bidId: uuid('bid_id').notNull().references(() => bids.id),
  deliverableKey: text('deliverable_key').notNull(), // references work plan deliverable by index key
  userId: uuid('user_id').references(() => users.id),
  agentId: uuid('agent_id').references(() => agents.id),
  roleTitle: text('role_title'),
  paymentShareBps: integer('payment_share_bps').notNull(), // basis points out of 10000
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bid_assignments_bid').on(table.bidId),
]);
