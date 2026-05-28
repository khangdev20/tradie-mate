import {
  pgTable, uuid, text, boolean,
  timestamp, json, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { notificationTypeEnum } from './enums'

export const notifications = pgTable('notifications', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id),

  type:    notificationTypeEnum('type').notNull(),
  title:   text('title').notNull(),
  body:    text('body').notNull(),
  data:    json('data'),           // { job_id, invoice_id, ... }

  isRead:      boolean('is_read').default(false).notNull(),
  readAt:      timestamp('read_at', { withTimezone: true }),

  fcmMessageId: text('fcm_message_id'),
  sentAt:       timestamp('sent_at', { withTimezone: true }),
  deliveredAt:  timestamp('delivered_at', { withTimezone: true }),

  // Quick actions in notification
  actions: json('actions'),       // [{ label: "Accept", action: "accept_job" }]

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('notifications_tradie_read_idx').on(table.tradieId, table.isRead),
  index('notifications_tradie_created_idx').on(table.tradieId, table.createdAt),
])
