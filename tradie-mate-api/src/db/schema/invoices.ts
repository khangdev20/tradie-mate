import {
  pgTable, uuid, text, integer, decimal,
  timestamp, varchar, unique, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { customers } from './customers'
import { jobs } from './jobs'
import { invoiceStatusEnum, paymentMethodEnum } from './enums'

export const invoices = pgTable('invoices', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId:       uuid('tradie_id').notNull().references(() => tradies.id),
  jobId:          uuid('job_id').unique().references(() => jobs.id),
  customerId:     uuid('customer_id').references(() => customers.id),

  // Invoice numbering — sequential PER TRADIE: INV-0001
  invoiceNumber:   text('invoice_number').notNull(),
  invoicePrefix:   varchar('invoice_prefix', { length: 10 }).default('INV').notNull(),
  sequenceNumber:  integer('sequence_number').notNull(),

  status: invoiceStatusEnum('status').default('DRAFT').notNull(),

  // ALL FINANCIAL VALUES IN INTEGER CENTS — NEVER FLOAT
  subtotalCents:  integer('subtotal_cents').notNull(),
  gstCents:       integer('gst_cents').notNull(),     // exactly 10% of subtotal
  totalCents:     integer('total_cents').notNull(),   // subtotal + gst
  paidCents:      integer('paid_cents').default(0).notNull(),
  currency:       varchar('currency', { length: 3 }).default('AUD').notNull(),

  // Dates
  issuedAt:              timestamp('issued_at', { withTimezone: true }).default(sql`now()`).notNull(),
  dueAt:                 timestamp('due_at', { withTimezone: true }),
  paidAt:                timestamp('paid_at', { withTimezone: true }),
  sentAt:                timestamp('sent_at', { withTimezone: true }),
  overdueReminderSentAt: timestamp('overdue_reminder_sent_at', { withTimezone: true }),

  // Payment
  paymentMethod:         paymentMethodEnum('payment_method'),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  stripeChargeId:        text('stripe_charge_id'),

  // Documents
  signatureData:    text('signature_data'),     // base64
  signedAt:         timestamp('signed_at', { withTimezone: true }),
  pdfUrl:           text('pdf_url'),
  pdfGeneratedAt:   timestamp('pdf_generated_at', { withTimezone: true }),

  // Xero
  xeroInvoiceId:  text('xero_invoice_id').unique(),
  xeroSyncedAt:   timestamp('xero_synced_at', { withTimezone: true }),
  xeroSyncError:  text('xero_sync_error'),

  notes: text('notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  unique('invoices_tradie_seq_unique').on(table.tradieId, table.sequenceNumber),
  index('invoices_tradie_status_idx').on(table.tradieId, table.status),
  index('invoices_tradie_created_idx').on(table.tradieId, table.createdAt),
  index('invoices_stripe_idx').on(table.stripePaymentIntentId),
  index('invoices_status_due_idx').on(table.status, table.dueAt),
])

export const invoiceItems = pgTable('invoice_items', {
  id:             uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  invoiceId:      uuid('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),

  description:    text('description').notNull(),
  qty:            decimal('qty', { precision: 10, scale: 3 }).notNull(),
  unitPriceCents: integer('unit_price_cents').notNull(),
  lineTotalCents: integer('line_total_cents').notNull(), // stored, not computed
  unit:           text('unit').default('item').notNull(), // "hr", "m", "item", "m2"
  sortOrder:      integer('sort_order').default(0).notNull(),
  partsLibraryId: uuid('parts_library_id'),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('invoice_items_invoice_idx').on(table.invoiceId),
])
