import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';

export const skills = pgTable('skills', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(), // frontend, backend, design, data, devops, ai_ml, blockchain, business, writing, other
  description: text('description'),
  synonyms: jsonb('synonyms').default([]), // array of alternative names
  usageCount: integer('usage_count').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_skills_slug').on(table.slug),
  index('idx_skills_category').on(table.category),
]);
