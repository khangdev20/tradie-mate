import {
  pgTable, uuid, text, integer, boolean,
  timestamp, varchar, pgEnum, index, unique,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { jobs } from './jobs'

export const bookingStatusEnum = pgEnum('booking_status', [
  'PENDING', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS',
  'AWAITING_APPROVAL', 'COMPLETED', 'DISPUTED', 'CANCELLED',
])

export const escrowStatusEnum = pgEnum('escrow_status', [
  'HELD', 'RELEASED', 'REFUNDED', 'DISPUTED',
])

// Marketplace bookings — customer-initiated or platform-dispatched
export const marketplaceBookings = pgTable('marketplace_bookings', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:    uuid('tradie_id').notNull().references(() => tradies.id),
  jobId:       uuid('job_id').references(() => jobs.id),

  // Customer details (no Customer account required)
  customerName:  text('customer_name').notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),

  description:    text('description').notNull(),
  address:        text('address').notNull(),
  requestedAt:    timestamp('requested_at', { withTimezone: true }).notNull(),

  quotedAmountCents:  integer('quoted_amount_cents'),
  bookingFeeCents:    integer('booking_fee_cents'),  // 3-5% platform fee
  status:             bookingStatusEnum('status').default('PENDING').notNull(),

  // Dispute
  disputeReason:  text('dispute_reason'),
  disputedAt:     timestamp('disputed_at', { withTimezone: true }),
  resolvedAt:     timestamp('resolved_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('bookings_tradie_status_idx').on(table.tradieId, table.status),
])

// Escrow payments held until job completion approved
export const escrowPayments = pgTable('escrow_payments', {
  id:         uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  bookingId:  uuid('booking_id').notNull().references(() => marketplaceBookings.id),
  tradieId:   uuid('tradie_id').notNull().references(() => tradies.id),

  amountCents:         integer('amount_cents').notNull(),
  platformFeeCents:    integer('platform_fee_cents').notNull(),
  netPayoutCents:      integer('net_payout_cents').notNull(),

  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
  status:              escrowStatusEnum('status').default('HELD').notNull(),

  heldAt:       timestamp('held_at', { withTimezone: true }).default(sql`now()`).notNull(),
  releasedAt:   timestamp('released_at', { withTimezone: true }),
  refundedAt:   timestamp('refunded_at', { withTimezone: true }),
}, (table) => [
  index('escrow_booking_idx').on(table.bookingId),
  index('escrow_tradie_status_idx').on(table.tradieId, table.status),
])
