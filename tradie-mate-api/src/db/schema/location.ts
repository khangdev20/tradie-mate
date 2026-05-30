import {
  pgTable, bigserial, uuid, decimal,
  real, timestamp, text, boolean, integer,
  index, varchar, jsonb
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

export const geocodedAddresses = pgTable('geocoded_addresses', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  normalizedAddress: text('normalized_address').notNull(),
  formattedAddress: text('formatted_address').notNull(),
  latitudeMicro: integer('latitude_micro').notNull(), // latitude * 1_000_000
  longitudeMicro: integer('longitude_micro').notNull(), // longitude * 1_000_000
  confidence: integer('confidence').notNull(), // 0-100
  provider: varchar('provider', { length: 50 }).default('MAPBOX').notNull(),
  providerPlaceId: varchar('provider_place_id', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const routeCache = pgTable('route_cache', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  originGeohash: varchar('origin_geohash', { length: 20 }).notNull(),
  destinationGeohash: varchar('destination_geohash', { length: 20 }).notNull(),
  profile: varchar('profile', { length: 40 }).default('driving-traffic').notNull(),
  distanceMeters: integer('distance_meters').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  trafficDurationSeconds: integer('traffic_duration_seconds'),
  polyline: text('polyline').notNull(),
  providerPayload: jsonb('provider_payload'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const locationEvents = pgTable('location_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  jobId: uuid('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  eventType: varchar('event_type', { length: 80 }).notNull(), // PERMISSION_GRANTED | PERMISSION_DENIED | ROUTE_STARTED | ROUTE_FAILED | STALE_LOCATION
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

