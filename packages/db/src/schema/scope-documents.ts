import { pgTable, uuid, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { scopeProposals } from './scope-proposals';

export const scopeDocuments = pgTable('scope_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  scopeProposalId: uuid('scope_proposal_id').notNull().references(() => scopeProposals.id),
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  extractedText: text('extracted_text'),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
});
