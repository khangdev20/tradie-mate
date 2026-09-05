import {
  pgTable, uuid, text, integer, decimal,
  timestamp, varchar, unique, index, jsonb,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { invoices } from './invoices'

export const paymentEvents = pgTable('payment_events', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  invoiceId: uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 80 }).notNull(),
  source: varchar('source', { length: 40 }).notNull(),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('payment_events_invoice_idx').on(table.invoiceId),
  index('payment_events_tradie_created_idx').on(table.tradieId, table.createdAt),
])

export const payouts = pgTable('payouts', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id),

  amountCents:  integer('amount_cents').notNull(),
  currency:     varchar('currency', { length: 3 }).default('AUD').notNull(),
  status:       text('status').default('pending').notNull(), // pending|processing|paid|failed

  stripePayoutId:  text('stripe_payout_id').unique(),
  stripeAccountId: text('stripe_account_id'),

  periodStartAt:     timestamp('period_start_at', { withTimezone: true }).notNull(),
  periodEndAt:       timestamp('period_end_at', { withTimezone: true }).notNull(),
  expectedArrivalAt: timestamp('expected_arrival_at', { withTimezone: true }),
  paidAt:            timestamp('paid_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('payouts_tradie_status_idx').on(table.tradieId, table.status),
  index('payouts_tradie_created_idx').on(table.tradieId, table.createdAt),
])

// Denormalized — fast Dashboard stats queries
export const earningsSummaries = pgTable('earnings_summaries', {
  id:       uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id),

  periodType:  text('period_type').notNull(),        // day | week | month | year
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),

  jobsCompleted:      integer('jobs_completed').default(0).notNull(),
  totalEarnedCents:   integer('total_earned_cents').default(0).notNull(),
  avgJobValueCents:   integer('avg_job_value_cents').default(0).notNull(),
  totalHoursWorked:   decimal('total_hours_worked', { precision: 6, scale: 2 }).default('0').notNull(),
  pendingPayoutCents: integer('pending_payout_cents').default(0).notNull(),

  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  unique('earnings_tradie_period_unique').on(table.tradieId, table.periodType, table.periodStart),
  index('earnings_tradie_period_idx').on(table.tradieId, table.periodType, table.periodStart),
])
