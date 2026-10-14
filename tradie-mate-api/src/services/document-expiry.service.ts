import { and, inArray, lt, eq } from 'drizzle-orm'
import { db } from '../config/db'
import { tradeDocuments } from '../db/schema/documents'
import { licenceAutomationRuns } from '../db/schema/licenceAutomation'
import { NotificationService } from './notification.service'

const DAY_MS = 24 * 60 * 60 * 1000

export type ExpiryReminder = 'EXPIRED' | 'DAYS_7' | 'DAYS_30' | 'DAYS_60'

type ReminderDoc = {
  status: string
  expiresAt: Date | null
  expiry60DaySentAt: Date | null
  expiry30DaySentAt: Date | null
  expiry7DaySentAt: Date | null
}

const ACTIVE_STATUSES = ['VERIFIED', 'EXPIRING_SOON'] as const

const DOC_LABELS: Record<string, string> = {
  TRADE_LICENCE: 'trade licence',
  PUBLIC_LIABILITY_INSURANCE: 'public liability insurance',
  WHITE_CARD: 'White Card',
  POLICE_CHECK: 'police check',
}

/**
 * Which reminder (if any) is due for a document today. Only the most urgent
 * unsent stage is returned, so a document first seen at 20 days left gets the
 * 30-day reminder only, never a late 60-day one.
 */
export function getDueExpiryReminder(doc: ReminderDoc, now: Date): ExpiryReminder | null {
  if (!doc.expiresAt || !(ACTIVE_STATUSES as readonly string[]).includes(doc.status)) return null

  const daysLeft = (doc.expiresAt.getTime() - now.getTime()) / DAY_MS
  if (daysLeft <= 0) return 'EXPIRED'
  if (daysLeft <= 7) return doc.expiry7DaySentAt ? null : 'DAYS_7'
  if (daysLeft <= 30) return doc.expiry30DaySentAt || doc.expiry7DaySentAt ? null : 'DAYS_30'
  if (daysLeft <= 60) {
    return doc.expiry60DaySentAt || doc.expiry30DaySentAt || doc.expiry7DaySentAt ? null : 'DAYS_60'
  }
  return null
}

const STATE_PATTERNS: Array<[string, RegExp]> = [
  ['NSW', /\bNSW\b|New South Wales|Fair Trading/i],
  ['QLD', /\bQLD\b|Queensland|QBCC/i],
  ['VIC', /\bVIC\b|Victoria|\bVBA\b/i],
  ['SA', /\bSA\b|South Australia|Consumer and Business Services|\bCBS\b/i],
  ['WA', /\bWA\b|Western Australia|EnergySafety|Building and Energy/i],
  ['TAS', /\bTAS\b|Tasmania/i],
  ['ACT', /\bACT\b|Australian Capital Territory|Access Canberra/i],
  ['NT', /\bNT\b|Northern Territory/i],
]

/** Infer the issuing state from the authority captured at upload/OCR time. */
export function inferLicenceState(issuingAuthority: string | null | undefined): string | null {
  if (!issuingAuthority) return null
  for (const [state, pattern] of STATE_PATTERNS) {
    if (pattern.test(issuingAuthority)) return state
  }
  return null
}

export interface LicenceVerifyJob {
  runId: string
  tradieId: string
  documentId: string
  docType: string
  state: string
  licenceNumber: string
}

export class DocumentExpiryService {
  /**
   * Nightly pass over documents expiring within 60 days:
   *  - sends the 60/30/7-day reminder or marks the document EXPIRED, and
   *  - queues a registry re-check for trade licences so renewals are picked up.
   */
  static async runNightlyChecks(
    enqueueLicenceVerify: (job: LicenceVerifyJob) => Promise<void>,
    now = new Date(),
  ) {
    const horizon = new Date(now.getTime() + 60 * DAY_MS)
    const docs = await db
      .select()
      .from(tradeDocuments)
      .where(
        and(
          lt(tradeDocuments.expiresAt, horizon),
          inArray(tradeDocuments.status, [...ACTIVE_STATUSES]),
        ),
      )
      .limit(500)

    let reminders = 0
    let licenceChecks = 0

    for (const doc of docs) {
      const reminder = getDueExpiryReminder(doc, now)
      if (reminder) {
        await this.applyReminder(doc, reminder, now)
        reminders++
      }

      const state = inferLicenceState(doc.issuingAuthority)
      if (doc.docType === 'TRADE_LICENCE' && doc.docNumber && state) {
        const [run] = await db
          .insert(licenceAutomationRuns)
          .values({ tradieId: doc.tradieId, docType: doc.docType, state, status: 'QUEUED' })
          .returning()
        await enqueueLicenceVerify({
          runId: run.id,
          tradieId: doc.tradieId,
          documentId: doc.id,
          docType: doc.docType,
          state,
          licenceNumber: doc.docNumber,
        })
        licenceChecks++
      }
    }

    return { scanned: docs.length, reminders, licenceChecks }
  }

  private static async applyReminder(
    doc: typeof tradeDocuments.$inferSelect,
    reminder: ExpiryReminder,
    now: Date,
  ) {
    const label = DOC_LABELS[doc.docType] ?? 'document'

    if (reminder === 'EXPIRED') {
      await db
        .update(tradeDocuments)
        .set({ status: 'EXPIRED', updatedAt: now })
        .where(eq(tradeDocuments.id, doc.id))
      await NotificationService.notifyTradie(doc.tradieId, {
        type: 'DOC_EXPIRED',
        title: 'Document expired',
        body: `Your ${label} has expired. Upload a current one to keep receiving jobs.`,
        data: { documentId: doc.id, docType: doc.docType },
      })
      return
    }

    const days = reminder === 'DAYS_7' ? 7 : reminder === 'DAYS_30' ? 30 : 60
    const sentColumn =
      reminder === 'DAYS_7' ? { expiry7DaySentAt: now }
        : reminder === 'DAYS_30' ? { expiry30DaySentAt: now }
          : { expiry60DaySentAt: now }

    await db
      .update(tradeDocuments)
      .set({ status: 'EXPIRING_SOON', ...sentColumn, updatedAt: now })
      .where(eq(tradeDocuments.id, doc.id))
    await NotificationService.notifyTradie(doc.tradieId, {
      type: 'DOC_EXPIRING',
      title: 'Document expiring soon',
      body: `Your ${label} expires within ${days} days. Renew it to avoid job assignment being blocked.`,
      data: { documentId: doc.id, docType: doc.docType, daysLeft: days },
    })
  }
}
