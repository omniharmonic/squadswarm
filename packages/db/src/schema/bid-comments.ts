import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { bids } from './bids';
import { users } from './users';

export const bidComments = pgTable('bid_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  bidId: uuid('bid_id').notNull().references(() => bids.id),
  deliverableKey: text('deliverable_key'), // null = general bid comment
  userId: uuid('user_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_bid_comments_bid').on(table.bidId, table.createdAt),
]);
