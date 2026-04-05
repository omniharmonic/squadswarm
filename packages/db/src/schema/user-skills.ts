import { pgTable, uuid, text, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './users';
import { skills } from './skills';

export const userSkills = pgTable('user_skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  skillId: uuid('skill_id').notNull().references(() => skills.id),
  attestationCount: integer('attestation_count').default(0).notNull(),
  lastAttestedAt: timestamp('last_attested_at'),
  proficiencyLevel: text('proficiency_level').default('demonstrated').notNull(), // demonstrated, proficient, expert
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('idx_user_skills_unique').on(table.userId, table.skillId),
  index('idx_user_skills_user_id').on(table.userId),
]);
