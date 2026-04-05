import { pgTable, uuid, text, timestamp, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { contracts } from './contracts';
import { workstreams } from './workstreams';
import { users } from './users';
import { agents } from './agents';

export const deliverables = pgTable('deliverables', {
  id: uuid('id').primaryKey().defaultRandom(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  workstreamId: uuid('workstream_id').notNull().references(() => workstreams.id),
  title: text('title').notNull(),
  description: text('description'),
  format: text('format').notNull(),
  acceptanceCriteria: jsonb('acceptance_criteria'),
  assignedMemberId: uuid('assigned_member_id').references(() => users.id),
  assignedAgentId: uuid('assigned_agent_id').references(() => agents.id),
  estimatedEffortHours: integer('estimated_effort_hours'),
  status: text('status').default('not_started').notNull(),
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  requiredSkills: jsonb('required_skills').default([]), // Array of skill slugs
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_deliverables_contract_status').on(table.contractId, table.status),
]);
