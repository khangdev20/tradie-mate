import { pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, pgEnum, unique } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'


export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'TRIALING',
  'ACTIVE',
  'PAST_DUE',
  'CANCELED',
  'INCOMPLETE',
])

export const billingIntervalEnum = pgEnum('billing_interval', ['MONTH', 'YEAR'])

export const subscriptionPlans = pgTable('subscription_plans', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  code: varchar('code', { length: 80 }).notNull().unique(), // e.g. SOLO_STARTER, SOLO_PRO, TEAM
  displayName: varchar('display_name', { length: 120 }).notNull(),
  description: text('description'),
  priceCents: integer('price_cents').notNull(),
  currency: varchar('currency', { length: 3 }).default('AUD').notNull(),
  billingInterval: billingIntervalEnum('billing_interval').default('MONTH').notNull(),
  stripePriceId: varchar('stripe_price_id', { length: 255 }).notNull(),
  isPublic: boolean('is_public').default(true).notNull(),
  sortOrder: integer('sort_order').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const planEntitlements = pgTable('plan_entitlements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  planCode: varchar('plan_code', { length: 80 }).notNull().references(() => subscriptionPlans.code, { onDelete: 'cascade' }),
  entitlements: jsonb('entitlements').notNull(), // feature flags + usage limits
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const tradieSubscriptions = pgTable('tradie_subscriptions', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  planCode: varchar('plan_code', { length: 80 }).notNull(),
  status: subscriptionStatusEnum('status').default('TRIALING').notNull(),
  stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
  stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  currentPeriodStart: timestamp('current_period_start', { withTimezone: true }),
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const entitlementOverrides = pgTable('entitlement_overrides', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  entitlements: jsonb('entitlements').notNull(),
  reason: text('reason').notNull(), // founder, beta, migration credit, support comp
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
})

export const usageCounters = pgTable('usage_counters', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  tradieId: uuid('tradie_id').notNull().references(() => tradies.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 120 }).notNull(), // invoices_created, jobs_created
  periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
  periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
  count: integer('count').default(0).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  unique('usage_counters_unique_idx').on(table.tradieId, table.key, table.periodStart, table.periodEnd)
])

