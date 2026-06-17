import {
  pgTable, uuid, text, integer,
  timestamp, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { documentTypeEnum, documentStatusEnum } from './enums'

export const tradeDocuments = pgTable('trade_documents', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id),

  docType:           documentTypeEnum('doc_type').notNull(),
  status:            documentStatusEnum('status').default('PENDING').notNull(),

  issuingAuthority:  text('issuing_authority'),
  docNumber:         text('doc_number'),
  issuedAt:          timestamp('issued_at', { withTimezone: true }),
  expiresAt:         timestamp('expires_at', { withTimezone: true }),

  storageUrl:        text('storage_url'),
  storagePath:       text('storage_path'),
  mimeType:          text('mime_type'),
  fileSizeBytes:     integer('file_size_bytes'),

  verifiedAt:        timestamp('verified_at', { withTimezone: true }),
  verifiedBy:        uuid('verified_by'),
  rejectionReason:   text('rejection_reason'),
  ocrPayload:      text('ocr_payload'),

  // Expiry reminder tracking — prevent duplicate sends
  expiry60DaySentAt: timestamp('expiry_60_day_sent_at', { withTimezone: true }),
  expiry30DaySentAt: timestamp('expiry_30_day_sent_at', { withTimezone: true }),
  expiry7DaySentAt:  timestamp('expiry_7_day_sent_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('documents_tradie_type_idx').on(table.tradieId, table.docType),
  index('documents_tradie_status_idx').on(table.tradieId, table.status),
  index('documents_expiry_idx').on(table.expiresAt, table.status),
])
