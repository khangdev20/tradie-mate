import {
  pgTable, uuid, text, integer,
  timestamp, boolean, json, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const callLogs = pgTable('call_logs', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull(),

  callSid:      text('call_sid').notNull().unique(),  // Twilio Call SID
  from:         text('from').notNull(),
  to:           text('to').notNull(),
  durationSec:  integer('duration_sec'),
  recordingUrl: text('recording_url'),
  recordingSid: text('recording_sid'),

  // AI processing
  transcript:     text('transcript'),
  extractedData:  json('extracted_data'),  // { customer_name, address, issue, urgency }
  processedAt:    timestamp('processed_at', { withTimezone: true }),
  processingError: text('processing_error'),

  // Job creation
  jobCreated: boolean('job_created').default(false).notNull(),
  jobId:      uuid('job_id'),

  callStartedAt: timestamp('call_started_at', { withTimezone: true }).notNull(),
  createdAt:     timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('call_logs_tradie_idx').on(table.tradieId),
  index('call_logs_sid_idx').on(table.callSid),
])
