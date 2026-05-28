import {
  pgTable, uuid, text, integer,
  timestamp, boolean, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { customers } from './customers'

export const reviews = pgTable('reviews', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:   uuid('tradie_id').notNull().references(() => tradies.id),
  jobId:      uuid('job_id').notNull().unique(),
  customerId: uuid('customer_id').references(() => customers.id),

  rating:   integer('rating').notNull(),        // 1–5
  title:    text('title'),
  body:     text('body'),
  jobType:  text('job_type'),
  photos:   text('photos').array().default(sql`'{}'`),

  replyBody:  text('reply_body'),
  repliedAt:  timestamp('replied_at', { withTimezone: true }),

  isPublic:   boolean('is_public').default(true).notNull(),
  isVerified: boolean('is_verified').default(true).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('reviews_tradie_public_idx').on(table.tradieId, table.isPublic),
  index('reviews_tradie_rating_idx').on(table.tradieId, table.rating),
  index('reviews_tradie_created_idx').on(table.tradieId, table.createdAt),
])
