/**
 * TradieMate BullMQ Worker
 * Handles all background queue jobs:
 *   - document-ocr: Async OCR/verification of uploaded documents
 *   - xero-sync: Syncing invoices to Xero
 *   - vapi-transcript: Processing Vapi.ai call transcripts
 *   - licence-verify: Automated licence verification via state registries
 *   - escrow-release: Releasing escrow after job completion approval
 *
 * Run with: npm run queue:worker
 */

import { Worker, Queue, Job } from 'bullmq'
import { redisConnection } from '../config/redis'
import { db } from '../config/db'
import { tradeDocuments } from '../db/schema/documents'
import { invoices } from '../db/schema/invoices'
import { xeroConnections } from '../db/schema/xero'
import { callLogs } from '../db/schema/calls'
import { licenceAutomationRuns } from '../db/schema/licenceAutomation'
import { escrowPayments, marketplaceBookings } from '../db/schema/marketplace'
import { tradies } from '../db/schema/tradies'
import { jobs } from '../db/schema/jobs'
import { stripe } from '../config/stripe'
import { eq, and, lt } from 'drizzle-orm'
import OpenAI from 'openai'
import { extractDocumentFields, evaluateOcrForDocumentType } from '../services/textract.service'
import { checkLicenceRegistry } from '../services/licence-registry.service'
import { WebhookInboxService } from '../services/webhook-inbox.service'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || '' })

// ─── Document OCR Worker ───────────────────────────────────────────────────

const documentOcrWorker = new Worker(
  'document-ocr',
  async (job: Job) => {
    const { documentId, tradieId, storageUrl, documentType } = job.data

    console.log(`[OCR] Processing document ${documentId} (${documentType})`)

    try {
      const ocr = await extractDocumentFields(storageUrl, documentType)
      const status = evaluateOcrForDocumentType(ocr, documentType)

      await db
        .update(tradeDocuments)
        .set({
          status,
          ocrPayload: JSON.stringify(ocr),
          docNumber: ocr.licenceNumber,
          updatedAt: new Date(),
        })
        .where(eq(tradeDocuments.id, documentId))

      console.log(`[OCR] Document ${documentId} → ${status}`)
    } catch (err) {
      console.error(`[OCR] Failed to process document ${documentId}:`, err)
      throw err
    }
  },
  { connection: redisConnection, concurrency: 5 }
)

// ─── Xero Sync Worker ──────────────────────────────────────────────────────

const xeroSyncWorker = new Worker(
  'xero-sync',
  async (job: Job) => {
    const { invoiceId, tradieId } = job.data

    console.log(`[Xero] Syncing invoice ${invoiceId} for tradie ${tradieId}`)

    try {
      // Load Xero connection
      const [xeroConn] = await db
        .select()
        .from(xeroConnections)
        .where(and(eq(xeroConnections.tradieId, tradieId)))
        .limit(1)

      if (!xeroConn || xeroConn.disconnectedAt) {
        console.warn(`[Xero] No active connection for tradie ${tradieId}`)
        return
      }

      // Refresh token if expired
      let accessToken = xeroConn.accessToken
      if (new Date(xeroConn.tokenExpiresAt) <= new Date()) {
        const refreshed = await refreshXeroToken(xeroConn.refreshToken, xeroConn.tradieId)
        accessToken = refreshed
      }

      // Fetch invoice details
      const [invoice] = await db
        .select()
        .from(invoices)
        .where(eq(invoices.id, invoiceId))
        .limit(1)

      if (!invoice) {
        console.warn(`[Xero] Invoice ${invoiceId} not found`)
        return
      }

      // Push to Xero API
      await syncInvoiceToXero(accessToken, xeroConn.tenantId, invoice)

      // Update last sync time
      await db
        .update(xeroConnections)
        .set({ lastSyncAt: new Date() })
        .where(eq(xeroConnections.tradieId, tradieId))

      console.log(`[Xero] Invoice ${invoiceId} synced successfully`)
    } catch (err) {
      console.error(`[Xero] Sync failed for invoice ${invoiceId}:`, err)
      await db
        .update(xeroConnections)
        .set({ syncError: String(err), lastSyncAt: new Date() })
        .where(eq(xeroConnections.tradieId, tradieId))
      throw err
    }
  },
  { connection: redisConnection, concurrency: 3 }
)

// ─── Vapi Transcript Worker ────────────────────────────────────────────────

const vapiTranscriptWorker = new Worker(
  'vapi-transcript',
  async (job: Job) => {
    const { callId, transcript, tradiePhoneNumber, recordingUrl } = job.data

    console.log(`[Vapi] Processing transcript for call ${callId}`)

    try {
      if (!transcript || transcript.length < 10) {
        console.warn(`[Vapi] Empty transcript for call ${callId}`)
        return
      }

      // Extract job details using OpenAI
      let extractedData: any = null
      if (process.env.OPENAI_API_KEY) {
        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Extract job booking details from this Australian tradie voicemail. Return ONLY valid JSON:
{
  "customerName": "string or null",
  "customerPhone": "string or null",
  "jobDescription": "string",
  "address": "string or null",
  "suburb": "string or null",
  "urgency": "EMERGENCY | TODAY | THIS_WEEK | FLEXIBLE",
  "confidence": 0-100
}`,
            },
            { role: 'user', content: transcript },
          ],
          temperature: 0.1,
          max_tokens: 300,
        })
        extractedData = JSON.parse(completion.choices[0]?.message?.content?.trim() || '{}')
      }

      console.log(`[Vapi] Transcript processed for call ${callId}:`, extractedData)
    } catch (err) {
      console.error(`[Vapi] Transcript processing failed for call ${callId}:`, err)
      throw err
    }
  },
  { connection: redisConnection, concurrency: 2 }
)

// ─── Licence Verification Worker (Phase 4.1) ──────────────────────────────

const licenceVerifyWorker = new Worker(
  'licence-verify',
  async (job: Job) => {
    const { runId, tradieId, docType, state } = job.data

    console.log(`[Licence] Verifying ${docType} for tradie ${tradieId} in ${state}`)

    await db
      .update(licenceAutomationRuns)
      .set({ status: 'IN_PROGRESS' })
      .where(eq(licenceAutomationRuns.id, runId))

    try {
      const result = await checkLicenceRegistry(tradieId, docType, state)

      await db
        .update(licenceAutomationRuns)
        .set({
          status: result.valid ? 'VERIFIED' : 'EXPIRED',
          checkedAt: new Date(),
          expiresAt: result.expiresAt,
          rawPayload: result,
        })
        .where(eq(licenceAutomationRuns.id, runId))

      // Update trade document if found
      if (result.valid) {
        await db
          .update(tradeDocuments)
          .set({
            status: 'VERIFIED',
            verifiedAt: new Date(),
            expiresAt: result.expiresAt || null,
            updatedAt: new Date(),
          })
          .where(and(eq(tradeDocuments.tradieId, tradieId), eq(tradeDocuments.docType, docType as any)))
      }

      console.log(`[Licence] Verification complete for tradie ${tradieId}: ${result.valid ? 'VALID' : 'INVALID'}`)
    } catch (err) {
      await db
        .update(licenceAutomationRuns)
        .set({
          status: 'ERROR',
          errorMsg: String(err),
          checkedAt: new Date(),
        })
        .where(eq(licenceAutomationRuns.id, runId))
      throw err
    }
  },
  { connection: redisConnection, concurrency: 3 }
)

// ─── Escrow Release Worker (Phase 4.4) ────────────────────────────────────

const escrowReleaseWorker = new Worker(
  'escrow-release',
  async (job: Job) => {
    const { jobId, tradieId } = job.data

    console.log(`[Escrow] Releasing escrow for job ${jobId}`)

    try {
      // Find escrow payment via booking
      const [booking] = await db
        .select()
        .from(marketplaceBookings)
        .where(eq(marketplaceBookings.jobId, jobId))
        .limit(1)

      if (!booking) {
        console.warn(`[Escrow] No marketplace booking found for job ${jobId}`)
        return
      }

      const [escrow] = await db
        .select()
        .from(escrowPayments)
        .where(and(eq(escrowPayments.bookingId, booking.id), eq(escrowPayments.status, 'HELD')))
        .limit(1)

      if (!escrow) {
        console.warn(`[Escrow] No held escrow found for booking ${booking.id}`)
        return
      }

      // Capture the PaymentIntent (release funds)
      if (escrow.stripePaymentIntentId) {
        await stripe.paymentIntents.capture(escrow.stripePaymentIntentId)
      }

      // Update escrow and booking status
      await db
        .update(escrowPayments)
        .set({ status: 'RELEASED', releasedAt: new Date() })
        .where(eq(escrowPayments.id, escrow.id))

      await db
        .update(marketplaceBookings)
        .set({ status: 'COMPLETED', updatedAt: new Date() })
        .where(eq(marketplaceBookings.id, booking.id))

      console.log(`[Escrow] Released ${escrow.amountCents} cents for job ${jobId}`)
    } catch (err) {
      console.error(`[Escrow] Release failed for job ${jobId}:`, err)
      throw err
    }
  },
  { connection: redisConnection, concurrency: 2 }
)

// ─── Scheduled Cron Jobs ──────────────────────────────────────────────────

/**
 * Scheduled queue — runs licence checks nightly
 */
const licenceScheduleQueue = new Queue('licence-schedule', { connection: redisConnection })

async function scheduleNightlyLicenceChecks() {
  // Find all tradies with documents expiring in 60 days
  const sixtyDaysFromNow = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  const expiring = await db
    .select({
      tradieId: tradeDocuments.tradieId,
      docType: tradeDocuments.docType,
    })
    .from(tradeDocuments)
    .where(
      and(
        lt(tradeDocuments.expiresAt as any, sixtyDaysFromNow),
        eq(tradeDocuments.status, 'VERIFIED')
      )
    )
    .limit(100)

  for (const doc of expiring) {
    await licenceScheduleQueue.add('check', { tradieId: doc.tradieId, docType: doc.docType }, {
      jobId: `licence-${doc.tradieId}-${doc.docType}`, // Deduplicate
    })
  }

  console.log(`[Cron] Scheduled ${expiring.length} licence verification checks`)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function refreshXeroToken(refreshToken: string, tradieId: string): Promise<string> {
  const res = await fetch('https://identity.xero.com/connect/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${process.env.XERO_CLIENT_ID}:${process.env.XERO_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  })

  if (!res.ok) throw new Error('Xero token refresh failed')
  const data = await res.json() as any

  await db
    .update(xeroConnections)
    .set({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + data.expires_in * 1000),
    })
    .where(eq(xeroConnections.tradieId, tradieId))

  return data.access_token
}

async function syncInvoiceToXero(accessToken: string, tenantId: string, invoice: any) {
  const xeroInvoice = {
    Type: 'ACCREC',
    Reference: invoice.invoiceNumber,
    Status: invoice.status === 'PAID' ? 'PAID' : 'AUTHORISED',
    LineItems: [
      {
        Description: `TradieMate Invoice ${invoice.invoiceNumber}`,
        Quantity: 1,
        UnitAmount: (invoice.subtotalCents / 100).toFixed(2),
        TaxType: 'OUTPUT2', // Australian GST
        AccountCode: '200', // Standard sales account
      },
    ],
    DueDateString: invoice.dueAt ? new Date(invoice.dueAt).toISOString().split('T')[0] : undefined,
  }

  const res = await fetch('https://api.xero.com/api.xro/2.0/Invoices', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Xero-tenant-id': tenantId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ Invoices: [xeroInvoice] }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`Xero API error ${res.status}: ${errBody}`)
  }
}

// ─── Webhook Replay Worker ─────────────────────────────────────────────────

const webhookReplayWorker = new Worker(
  'webhook-replay',
  async (job: Job) => {
    const pending = await WebhookInboxService.getPendingBatch(10)
    for (const row of pending) {
      try {
        console.log(`[WebhookReplay] Replaying ${row.provider} ${row.eventId}`)
        await WebhookInboxService.markProcessed(row.id)
      } catch (err) {
        await WebhookInboxService.markFailed(row.id, String(err))
        throw err
      }
    }
  },
  { connection: redisConnection, concurrency: 1 },
)

// ─── Start All Workers ────────────────────────────────────────────────────

console.log('🚀 TradieMate BullMQ Worker started')
console.log('  Workers: document-ocr, xero-sync, vapi-transcript, licence-verify, escrow-release, webhook-replay')

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down workers...')
  await Promise.all([
    documentOcrWorker.close(),
    xeroSyncWorker.close(),
    vapiTranscriptWorker.close(),
    licenceVerifyWorker.close(),
    escrowReleaseWorker.close(),
    webhookReplayWorker.close(),
  ])
  process.exit(0)
})
