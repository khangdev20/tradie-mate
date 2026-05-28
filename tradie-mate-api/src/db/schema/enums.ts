import { pgEnum } from 'drizzle-orm/pg-core'

export const tradeTypeEnum = pgEnum('trade_type', [
  'PLUMBER', 'ELECTRICIAN', 'CARPENTER',
  'HVAC', 'PAINTER', 'TILER', 'ROOFER', 'OTHER',
])

export const jobStatusEnum = pgEnum('job_status', [
  'DRAFT',        // created, not confirmed
  'UPCOMING',     // confirmed
  'COMMUTING',    // slide to start → tracking active
  'ARRIVED',      // tradie marked arrived
  'IN_PROGRESS',  // work underway
  'COMPLETED',    // work done, invoice pending
  'INVOICED',     // invoice sent
  'CANCELLED',
])

export const invoiceStatusEnum = pgEnum('invoice_status', [
  'DRAFT', 'SENT', 'PAID', 'OVERDUE', 'VOID',
])

export const documentTypeEnum = pgEnum('document_type', [
  'TRADE_LICENCE',
  'PUBLIC_LIABILITY_INSURANCE',
  'WHITE_CARD',
  'POLICE_CHECK',
  'WORKERS_COMPENSATION',
  'OTHER',
])

export const documentStatusEnum = pgEnum('document_status', [
  'PENDING', 'UNDER_REVIEW', 'VERIFIED',
  'EXPIRING_SOON', 'EXPIRED', 'REJECTED',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'JOB_ASSIGNED', 'JOB_REMINDER', 'PAYMENT_RECEIVED',
  'NEW_REVIEW', 'DOC_EXPIRING', 'DOC_EXPIRED',
  'OFFLINE_SYNC_COMPLETE', 'CALL_JOB_CREATED',
])

export const paymentMethodEnum = pgEnum('payment_method', [
  'STRIPE_TAP_TO_PAY', 'STRIPE_CARD',
  'CASH', 'BANK_TRANSFER', 'SQUARE',
])

export const urgencyLevelEnum = pgEnum('urgency_level', [
  'EMERGENCY', 'TODAY', 'THIS_WEEK', 'FLEXIBLE',
])

export const jobSourceEnum = pgEnum('job_source', [
  'MANUAL', 'PHONE_CALL', 'CUSTOMER_BOOKING', 'REFERRAL',
])
