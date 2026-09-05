import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { invoices, invoiceItems, invoiceSequence } from '../../db/schema/invoices'
import { eq, and } from 'drizzle-orm'
import { JobService, JobStatus } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
import { GSTService } from '../../services/gst.service'
import { PaymentService } from '../../services/payment.service'
import { AppError } from '../../utils/errors'
import { redis } from '../../utils/redis'

interface SyncAction {
  action: 'UPDATE_STATUS' | 'CREATE_INVOICE' | 'CREATE_JOB' | 'PAY_INVOICE' | 'RECORD_CASH_PAYMENT'
  payload: any
  idempotencyKey?: string
}

const IDEMPOTENCY_TTL_SECONDS = 60 * 60 * 24 * 7

async function isDuplicateSync(tradieId: string, idempotencyKey?: string): Promise<boolean> {
  if (!idempotencyKey) return false
  const key = `sync:idempotency:${tradieId}:${idempotencyKey}`
  const exists = await redis.get(key)
  return exists === '1'
}

async function markSyncProcessed(tradieId: string, idempotencyKey?: string): Promise<void> {
  if (!idempotencyKey) return
  const key = `sync:idempotency:${tradieId}:${idempotencyKey}`
  await redis.set(key, '1', 'EX', IDEMPOTENCY_TTL_SECONDS)
}

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireOnboarded)

  fastify.post('/', async (request: FastifyRequest<{
    Body: { queue: SyncAction[] }
  }>) => {
    const { queue } = request.body
    const tradieId = request.tradie.id

    if (!queue || !Array.isArray(queue)) {
      throw new AppError('Queue must be an array of sync actions.', 400, 'VALIDATION_ERROR')
    }

    let syncedCount = 0
    const results: { action: string; status: 'SUCCESS' | 'SKIPPED' | 'FAILED'; error?: string }[] = []

    for (const item of queue) {
      try {
        if (item.idempotencyKey && (await isDuplicateSync(tradieId, item.idempotencyKey))) {
          results.push({ action: item.action, status: 'SKIPPED', error: 'Already processed' })
          continue
        }

        if (item.action === 'UPDATE_STATUS') {
          const { jobId, status, timestamp } = item.payload
          const normalizedStatus = JobService.normalizeStatus(status) as JobStatus

          const [job] = await db
            .select({ updatedAt: jobs.updatedAt, status: jobs.status })
            .from(jobs)
            .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
            .limit(1)

          if (!job) {
            results.push({ action: 'UPDATE_STATUS', status: 'FAILED', error: 'Job not found' })
            continue
          }

          const clientTime = new Date(timestamp)
          if (job.updatedAt && job.updatedAt > clientTime) {
            results.push({ action: 'UPDATE_STATUS', status: 'SKIPPED', error: 'Server version is newer' })
            continue
          }

          await JobService.transitionStatus(jobId, tradieId, normalizedStatus)

          await db
            .update(jobs)
            .set({ updatedAt: new Date(timestamp) })
            .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))

          await markSyncProcessed(tradieId, item.idempotencyKey)
          results.push({ action: 'UPDATE_STATUS', status: 'SUCCESS' })
          syncedCount++
        } else if (item.action === 'CREATE_INVOICE') {
          const { invoiceId, jobId, items, timestamp } = item.payload

          const [existing] = await db
            .select()
            .from(invoices)
            .where(eq(invoices.id, invoiceId))
            .limit(1)

          if (existing) {
            results.push({ action: 'CREATE_INVOICE', status: 'SKIPPED', error: 'Invoice already exists' })
            await markSyncProcessed(tradieId, item.idempotencyKey)
            continue
          }

          await db.transaction(async (tx) => {
            let [seq] = await tx
              .select()
              .from(invoiceSequence)
              .where(eq(invoiceSequence.tradieId, tradieId))
              .for('update')

            let nextCounter = 1
            if (!seq) {
              await tx.insert(invoiceSequence).values({ tradieId, counter: 1 })
            } else {
              nextCounter = seq.counter + 1
              await tx
                .update(invoiceSequence)
                .set({ counter: nextCounter })
                .where(eq(invoiceSequence.tradieId, tradieId))
            }

            const invoiceNumber = `INV-${String(nextCounter).padStart(4, '0')}`

            let subtotalCents = 0
            const calculatedItems = items.map((lineItem: any, idx: number) => {
              const unitPriceCents = lineItem.unitPriceCents ?? lineItem.unitPrice
              const lineTotalCents = Math.round(lineItem.quantity * unitPriceCents)
              subtotalCents += lineTotalCents
              return {
                description: lineItem.description,
                qty: lineItem.quantity.toString(),
                unitPriceCents,
                lineTotalCents,
                sortOrder: idx,
              }
            })

            const gstCalc = GSTService.calculateFromSubtotal(subtotalCents)

            await tx.insert(invoices).values({
              id: invoiceId,
              tradieId,
              jobId,
              invoiceNumber,
              invoicePrefix: 'INV',
              sequenceNumber: nextCounter,
              status: 'DRAFT',
              subtotalCents,
              gstCents: gstCalc.gst,
              totalCents: gstCalc.total,
              dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(timestamp),
              updatedAt: new Date(timestamp),
            })

            await tx.insert(invoiceItems).values(
              calculatedItems.map((lineItem: any) => ({
                ...lineItem,
                invoiceId,
                createdAt: new Date(timestamp),
              }))
            )
          })

          await markSyncProcessed(tradieId, item.idempotencyKey)
          results.push({ action: 'CREATE_INVOICE', status: 'SUCCESS' })
          syncedCount++
        } else if (item.action === 'CREATE_JOB') {
          const {
            title,
            customerName,
            customerPhone,
            address,
            scheduledAt,
            estimatedDurationMin,
            source,
            notes,
          } = item.payload

          await EntitlementService.requireUsageLimit(tradieId, 'jobsCreated', 'maxJobsPerMonth')

          await JobService.createJob(tradieId, {
            title,
            customerName,
            customerPhone,
            address,
            scheduledAt,
            estimatedDurationMin,
            source: source ?? 'MANUAL',
            notes,
          })

          await EntitlementService.incrementUsage(tradieId, 'jobsCreated')
          await markSyncProcessed(tradieId, item.idempotencyKey)
          results.push({ action: 'CREATE_JOB', status: 'SUCCESS' })
          syncedCount++
        } else if (item.action === 'PAY_INVOICE') {
          const { invoiceId, signatureData, timestamp } = item.payload

          await PaymentService.markInvoicePaid({
            invoiceId,
            tradieId,
            paymentMethod: 'STRIPE_TAP_TO_PAY',
            signatureData,
            source: 'offline_sync',
            eventType: 'client_confirmed',
          })

          await db
            .update(invoices)
            .set({ updatedAt: new Date(timestamp) })
            .where(and(eq(invoices.id, invoiceId), eq(invoices.tradieId, tradieId)))

          await markSyncProcessed(tradieId, item.idempotencyKey)
          results.push({ action: 'PAY_INVOICE', status: 'SUCCESS' })
          syncedCount++
        } else if (item.action === 'RECORD_CASH_PAYMENT') {
          const { invoiceId } = item.payload

          await PaymentService.markInvoicePaid({
            invoiceId,
            tradieId,
            paymentMethod: 'CASH',
            source: 'offline_sync',
            eventType: 'offline_cash_recorded',
          })

          await markSyncProcessed(tradieId, item.idempotencyKey)
          results.push({ action: 'RECORD_CASH_PAYMENT', status: 'SUCCESS' })
          syncedCount++
        } else {
          results.push({ action: item.action, status: 'FAILED', error: 'Action not supported' })
        }
      } catch (err: any) {
        console.error(`Sync item failed: ${item.action}`, err)
        results.push({ action: item.action, status: 'FAILED', error: err.message })
      }
    }

    return {
      success: true,
      data: {
        syncedCount,
        results,
      },
    }
  })
}
