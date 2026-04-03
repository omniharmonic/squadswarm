import { pgTable, uuid, text, timestamp, jsonb, uniqueIndex } from 'drizzle-orm/pg-core';
import { squads } from './squads';
import { users } from './users';

export const squadMembers = pgTable('squad_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  squadId: uuid('squad_id').notNull().references(() => squads.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  role: text('role').notNull().default('member'),
  permissions: jsonb('permissions'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('squad_members_squad_user_idx').on(table.squadId, table.userId),
]);
