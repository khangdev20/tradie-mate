import {
  pgTable, uuid, text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'

export const xeroConnections = pgTable('xero_connections', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().unique().references(() => tradies.id),

  tenantId:       text('tenant_id').notNull(),
  tenantName:     text('tenant_name'),
  accessToken:    text('access_token').notNull(),
  refreshToken:   text('refresh_token').notNull(),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }).notNull(),

  connectedAt:    timestamp('connected_at', { withTimezone: true }).default(sql`now()`).notNull(),
  disconnectedAt: timestamp('disconnected_at', { withTimezone: true }),
  lastSyncAt:     timestamp('last_sync_at', { withTimezone: true }),
  syncError:      text('sync_error'),
})
