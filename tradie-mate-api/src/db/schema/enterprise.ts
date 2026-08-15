import {
  pgTable, uuid, text, integer, boolean,
  timestamp, varchar, pgEnum, index,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { tradies } from './tradies'
import { jobs } from './jobs'

export const enterpriseJobStatusEnum = pgEnum('enterprise_job_status', [
  'DISPATCHED', 'ACCEPTED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED',
])

// Enterprise property management clients
export const enterpriseClients = pgTable('enterprise_clients', {
  id:          uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  companyName: text('company_name').notNull(),
  contactName: text('contact_name').notNull(),
  contactPhone: varchar('contact_phone', { length: 20 }),
  contactEmail: varchar('contact_email', { length: 255 }).notNull().unique(),
  apiKey:      varchar('api_key', { length: 64 }).notNull().unique(),
  isActive:    boolean('is_active').default(true).notNull(),
  maxMonthlyJobs: integer('max_monthly_jobs').default(100).notNull(),
  createdAt:   timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('enterprise_email_idx').on(table.contactEmail),
  index('enterprise_apikey_idx').on(table.apiKey),
])

// Enterprise-dispatched jobs
export const enterpriseJobs = pgTable('enterprise_jobs', {
  id:           uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  clientId:     uuid('client_id').notNull().references(() => enterpriseClients.id),
  tradieId:     uuid('tradie_id').notNull().references(() => tradies.id),
  jobId:        uuid('job_id').references(() => jobs.id),

  propertyRef:    varchar('property_ref', { length: 100 }).notNull(),
  propertyAddress: text('property_address').notNull(),
  issueType:      text('issue_type').notNull(),
  priority:       varchar('priority', { length: 20 }).default('NORMAL').notNull(),

  status:         enterpriseJobStatusEnum('status').default('DISPATCHED').notNull(),
  dispatchedAt:   timestamp('dispatched_at', { withTimezone: true }).default(sql`now()`).notNull(),
  acceptedAt:     timestamp('accepted_at', { withTimezone: true }),
  completedAt:    timestamp('completed_at', { withTimezone: true }),

  clientRef:      varchar('client_ref', { length: 100 }),

  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`).notNull(),
}, (table) => [
  index('enterprise_jobs_tradie_idx').on(table.tradieId, table.status),
  index('enterprise_jobs_client_idx').on(table.clientId),
])
