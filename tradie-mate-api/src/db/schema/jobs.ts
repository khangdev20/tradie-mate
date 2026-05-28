import {
  pgTable, uuid, text, integer, decimal,
  timestamp, varchar, json, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { customers } from './customers'
import { jobStatusEnum, urgencyLevelEnum, jobSourceEnum } from './enums'

export const jobs = pgTable('jobs', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:     uuid('tradie_id').notNull().references(() => tradies.id),
  customerId:   uuid('customer_id').references(() => customers.id),

  title:        text('title').notNull(),
  description:  text('description'),
  jobType:      text('job_type'),
  status:       jobStatusEnum('status').default('UPCOMING').notNull(),
  urgency:      urgencyLevelEnum('urgency').default('FLEXIBLE').notNull(),
  source:       jobSourceEnum('source').default('MANUAL').notNull(),

  // Scheduling (UTC stored, AEST displayed)
  scheduledAt:          timestamp('scheduled_at', { withTimezone: true }),
  estimatedDurationMin: integer('estimated_duration_min'),
  reminderSentAt:       timestamp('reminder_sent_at', { withTimezone: true }),

  // Location
  address:    text('address'),
  suburb:     text('suburb'),
  state:      varchar('state', { length: 3 }),
  postcode:   varchar('postcode', { length: 4 }),
  lat:        decimal('lat', { precision: 10, scale: 7 }),
  lng:        decimal('lng', { precision: 10, scale: 7 }),

  // Tracking lifecycle timestamps
  commutingStartedAt: timestamp('commuting_started_at', { withTimezone: true }),
  arrivedAt:          timestamp('arrived_at', { withTimezone: true }),
  startedAt:          timestamp('started_at', { withTimezone: true }),
  completedAt:        timestamp('completed_at', { withTimezone: true }),

  // Customer tracking link
  trackingToken:          varchar('tracking_token', { length: 36 }).unique(),
  trackingTokenExpiresAt: timestamp('tracking_token_expires_at', { withTimezone: true }),
  trackingLinkSentAt:     timestamp('tracking_link_sent_at', { withTimezone: true }),

  // Call automation ref
  callLogId: uuid('call_log_id'),

  // Media + notes
  photos:      text('photos').array().default(sql`'{}'`),
  notes:       text('notes'),
  partsNeeded: json('parts_needed'),  // [{ name, qty, unit, checked }]

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('jobs_tradie_status_idx').on(table.tradieId, table.status),
  index('jobs_tradie_scheduled_idx').on(table.tradieId, table.scheduledAt),
  index('jobs_customer_idx').on(table.customerId),
  index('jobs_tracking_token_idx').on(table.trackingToken),
  index('jobs_status_scheduled_idx').on(table.status, table.scheduledAt),
])
