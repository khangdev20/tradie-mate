import {
  pgTable, uuid, text, integer, varchar,
  timestamp, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { jobSourceEnum } from './enums'

export const customers = pgTable('customers', {
  id:              uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:        uuid('tradie_id').notNull().references(() => tradies.id),

  name:            text('name').notNull(),
  phone:           varchar('phone', { length: 20 }).notNull(),
  email:           varchar('email', { length: 255 }),
  address:         text('address'),
  suburb:          text('suburb'),
  state:           varchar('state', { length: 3 }),
  postcode:        varchar('postcode', { length: 4 }),
  notes:           text('notes'),

  // Denormalized stats
  totalJobs:       integer('total_jobs').default(0).notNull(),
  totalSpentCents: integer('total_spent_cents').default(0).notNull(),
  lastJobAt:       timestamp('last_job_at', { withTimezone: true }),

  source:          jobSourceEnum('source').default('MANUAL').notNull(),
  createdAt:       timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt:       timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('customers_tradie_idx').on(table.tradieId),
  index('customers_phone_idx').on(table.phone),
  index('customers_tradie_phone_idx').on(table.tradieId, table.phone),
])
