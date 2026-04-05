import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { bids } from './bids';
import { users } from './users';

export const bidVotes = pgTable('bid_votes', {
  id: uuid('id').primaryKey().defaultRandom(),
  bidId: uuid('bid_id').notNull().references(() => bids.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  vote: text('vote').notNull(), // 'approve' | 'approve_with_note' | 'request_change' | 'block' | 'reject' | 'abstain'
  comment: text('comment'),
  changeRequest: text('change_request'), // specific change requested (for request_change votes)
  votedAt: timestamp('voted_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bid_votes_bid').on(table.bidId),
  index('idx_bid_votes_user_bid').on(table.userId, table.bidId),
]);
