import { pgTable, uuid, text, timestamp, jsonb, integer, numeric } from 'drizzle-orm/pg-core';

export const squads = pgTable('squads', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').unique().notNull(),
  bio: text('bio'),
  avatarUrl: text('avatar_url'),
  missionStatement: text('mission_statement'),
  governanceModel: jsonb('governance_model').notNull(),
  revenueSplitDefault: jsonb('revenue_split_default'),
  multisigAddress: text('multisig_address'),
  chainId: integer('chain_id'),
  paymentMode: text('payment_mode').default('fiat').notNull(),
  trustScore: numeric('trust_score', { precision: 5, scale: 2 }).default('0'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
