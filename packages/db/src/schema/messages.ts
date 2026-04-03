import { pgTable, uuid, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { users } from './users';
import { agents } from './agents';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  channelType: text('channel_type').notNull(),
  channelId: text('channel_id'),
  authorUserId: uuid('author_user_id').references(() => users.id),
  authorAgentId: uuid('author_agent_id').references(() => agents.id),
  content: text('content').notNull(),
  mentions: jsonb('mentions').$type<string[]>().default([]),
  parentMessageId: uuid('parent_message_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_messages_contract_channel').on(table.contractId, table.channelType, table.channelId, table.createdAt),
]);
