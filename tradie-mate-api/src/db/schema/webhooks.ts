import {
  pgTable, uuid, text, timestamp, varchar, index, jsonb, boolean,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const rawWebhooks = pgTable('raw_webhooks', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  provider: varchar('provider', { length: 40 }).notNull(),
  eventId: varchar('event_id', { length: 255 }),
  signature: text('signature'),
  payload: jsonb('payload').notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  attempts: varchar('attempts', { length: 10 }).default('0').notNull(),
  lastError: text('last_error'),
  processedAt: timestamp('processed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('raw_webhooks_status_idx').on(table.status, table.createdAt),
  index('raw_webhooks_provider_event_idx').on(table.provider, table.eventId),
])

export const analyticsEvents = pgTable('analytics_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id'),
  sessionId: varchar('session_id', { length: 64 }),
  eventName: varchar('event_name', { length: 120 }).notNull(),
  properties: jsonb('properties'),
  platform: varchar('platform', { length: 20 }),
  appVersion: varchar('app_version', { length: 20 }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('analytics_events_name_idx').on(table.eventName, table.createdAt),
  index('analytics_events_tradie_idx').on(table.tradieId, table.createdAt),
])

export const voiceAgentConfigs = pgTable('voice_agent_configs', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().unique(),
  vapiAssistantId: text('vapi_assistant_id'),
  businessHours: jsonb('business_hours'),
  callScript: text('call_script'),
  disclosureText: text('disclosure_text'),
  isEnabled: boolean('is_enabled').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})
