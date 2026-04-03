import { pgTable, uuid, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';
import { deliverables } from './deliverables';
import { users } from './users';
import { agents } from './agents';

export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  deliverableId: uuid('deliverable_id').references(() => deliverables.id),
  contractId: uuid('contract_id'),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  version: integer('version').default(1).notNull(),
  uploadedByUserId: uuid('uploaded_by_user_id').references(() => users.id),
  uploadedByAgentId: uuid('uploaded_by_agent_id').references(() => agents.id),
  isFinalSubmission: boolean('is_final_submission').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
