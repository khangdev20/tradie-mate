import {
  pgTable, bigserial, uuid, decimal,
  real, timestamp, text, boolean, integer,
  index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { jobs } from './jobs'

// High-volume GPS pings — bigserial for performance
export const locationPings = pgTable('location_pings', {
  id:         bigserial('id', { mode: 'bigint' }).primaryKey(),
  tradieId:   uuid('tradie_id').notNull().references(() => tradies.id),
  jobId:      uuid('job_id').references(() => jobs.id),

  lat:        decimal('lat', { precision: 10, scale: 7 }).notNull(),
  lng:        decimal('lng', { precision: 10, scale: 7 }).notNull(),
  accuracy:   real('accuracy'),   // metres
  speed:      real('speed'),      // km/h
  heading:    real('heading'),    // 0–360 degrees
  altitude:   real('altitude'),   // metres

  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  source:     text('source').default('gps').notNull(), // gps | network | passive
}, (table) => [
  index('location_pings_tradie_time_idx').on(table.tradieId, table.recordedAt),
  index('location_pings_job_time_idx').on(table.jobId, table.recordedAt),
  index('location_pings_recorded_idx').on(table.recordedAt),
])

// Active tracking sessions — only when job is COMMUTING/IN_PROGRESS
export const trackingSessions = pgTable('tracking_sessions', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().unique().references(() => tradies.id),
  jobId:    uuid('job_id').notNull().unique().references(() => jobs.id),

  currentLat:          decimal('current_lat', { precision: 10, scale: 7 }),
  currentLng:          decimal('current_lng', { precision: 10, scale: 7 }),
  lastPingAt:          timestamp('last_ping_at', { withTimezone: true }),

  etaMinutes:          integer('eta_minutes'),
  etaCalculatedAt:     timestamp('eta_calculated_at', { withTimezone: true }),
  distanceRemainingKm: decimal('distance_remaining_km', { precision: 6, scale: 2 }),

  isActive:  boolean('is_active').default(true).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).default(sql`now()`).notNull(),
  endedAt:   timestamp('ended_at', { withTimezone: true }),
}, (table) => [
  index('tracking_sessions_tradie_active_idx').on(table.tradieId, table.isActive),
  index('tracking_sessions_job_idx').on(table.jobId),
])
