import {
  pgTable, uuid, text, boolean, timestamp,
  varchar, pgEnum, index, jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { documentTypeEnum } from './enums'

export const licenceCheckStatusEnum = pgEnum('licence_check_status', [
  'QUEUED', 'IN_PROGRESS', 'VERIFIED', 'EXPIRED', 'NOT_FOUND', 'ERROR',
])

// Automated licence checks via state registries
export const licenceAutomationRuns = pgTable('licence_automation_runs', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id),

  docType:  documentTypeEnum('doc_type').notNull(),
  state:    varchar('state', { length: 3 }).notNull(), // NSW, QLD, VIC

  status:   licenceCheckStatusEnum('status').default('QUEUED').notNull(),
  rawPayload: jsonb('raw_payload'),
  errorMsg:   text('error_msg'),

  checkedAt:  timestamp('checked_at', { withTimezone: true }),
  expiresAt:  timestamp('expires_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('licence_runs_tradie_idx').on(table.tradieId, table.status),
  index('licence_runs_queued_idx').on(table.status, table.createdAt),
])
