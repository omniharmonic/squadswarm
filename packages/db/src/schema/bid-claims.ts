import { pgTable, uuid, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { bids } from './bids';
import { users } from './users';
import { agents } from './agents';

export const bidClaims = pgTable('bid_claims', {
  id: uuid('id').primaryKey().defaultRandom(),
  bidId: uuid('bid_id').notNull().references(() => bids.id),
  deliverableKey: text('deliverable_key').notNull(),
  userId: uuid('user_id').references(() => users.id),
  agentId: uuid('agent_id').references(() => agents.id),
  proposedBps: integer('proposed_bps').notNull().default(0),
  status: text('status').default('claimed').notNull(), // 'claimed' | 'contested' | 'resolved' | 'withdrawn'
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bid_claims_bid').on(table.bidId),
  index('idx_bid_claims_bid_del').on(table.bidId, table.deliverableKey),
]);
