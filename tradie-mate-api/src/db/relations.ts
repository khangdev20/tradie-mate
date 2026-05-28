import { relations } from 'drizzle-orm'
import { tradies } from './schema/tradies'
import { customers } from './schema/customers'
import { jobs } from './schema/jobs'
import { invoices, invoiceItems } from './schema/invoices'
import { tradeDocuments } from './schema/documents'
import { reviews } from './schema/reviews'
import { locationPings, trackingSessions } from './schema/location'
import { notifications } from './schema/notifications'
import { callLogs } from './schema/calls'
import { payouts, earningsSummaries } from './schema/financials'
import { xeroConnections } from './schema/xero'

export const tradiesRelations = relations(tradies, ({ many, one }) => ({
  jobs:             many(jobs),
  customers:        many(customers),
  invoices:         many(invoices),
  documents:        many(tradeDocuments),
  reviews:          many(reviews),
  locationPings:    many(locationPings),
  trackingSession:  one(trackingSessions, { fields: [tradies.id], references: [trackingSessions.tradieId] }),
  notifications:    many(notifications),
  callLogs:         many(callLogs),
  payouts:          many(payouts),
  earningsSummaries: many(earningsSummaries),
  xeroConnection:   one(xeroConnections, { fields: [tradies.id], references: [xeroConnections.tradieId] }),
}))

export const jobsRelations = relations(jobs, ({ one, many }) => ({
  tradie:       one(tradies, { fields: [jobs.tradieId], references: [tradies.id] }),
  customer:     one(customers, { fields: [jobs.customerId], references: [customers.id] }),
  invoice:      one(invoices, { fields: [jobs.id], references: [invoices.jobId] }),
  locationPings: many(locationPings),
}))

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tradie:   one(tradies, { fields: [invoices.tradieId], references: [tradies.id] }),
  job:      one(jobs, { fields: [invoices.jobId], references: [jobs.id] }),
  customer: one(customers, { fields: [invoices.customerId], references: [customers.id] }),
  items:    many(invoiceItems),
}))

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, { fields: [invoiceItems.invoiceId], references: [invoices.id] }),
}))
