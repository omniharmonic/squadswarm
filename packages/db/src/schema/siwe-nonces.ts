import { pgTable, uuid, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

/**
 * Server-issued nonces for Sign-In With Ethereum. Each nonce is single-use and
 * short-lived; consuming it on verification prevents signature replay.
 */
export const siweNonces = pgTable(
  'siwe_nonces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    nonce: text('nonce').notNull().unique(),
    used: boolean('used').default(false).notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('idx_siwe_nonces_nonce').on(table.nonce)],
);
