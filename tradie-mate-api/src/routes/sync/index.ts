import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { invoices, invoiceItems, invoiceSequence } from '../../db/schema/invoices'
import { eq, and } from 'drizzle-orm'
import { JobService } from '../../services/job.service'
import { EntitlementService } from '../../services/entitlement.service'
import { GSTService } from '../../services/gst.service'
import { AppError } from '../../utils/errors'

interface SyncAction {
  action: 'UPDATE_STATUS' | 'CREATE_INVOICE' | 'CREATE_JOB' | 'PAY_INVOICE'
  payload: any
  idempotencyKey?: string
}

export async function syncRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/', async (request: FastifyRequest<{
    Body: { queue: SyncAction[] }
  }>) => {
    const { queue } = request.body
    const tradieId = request.tradie.id

    if (!queue || !Array.isArray(queue)) {
      throw new AppError('Queue must be an array of sync actions.', 400)
    }

    let syncedCount = 0
    const results: { action: string; status: 'SUCCESS' | 'SKIPPED' | 'FAILED'; error?: string }[] = []

    // Run synchronization within a single transaction block
    await db.transaction(async (tx) => {
      for (const item of queue) {
        try {
          if (item.action === 'UPDATE_STATUS') {
            const { jobId, status, timestamp } = item.payload
            
            // 1. Fetch server updatedAt
            const [job] = await tx
              .select({ updatedAt: jobs.updatedAt })
              .from(jobs)
              .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
              .limit(1)

            if (!job) {
              results.push({ action: 'UPDATE_STATUS', status: 'FAILED', error: 'Job not found' })
              continue
            }

            // 2. Server-Wins Conflict Resolution: Skip if server is newer
            const clientTime = new Date(timestamp)
            if (job.updatedAt && job.updatedAt > clientTime) {
              results.push({ action: 'UPDATE_STATUS', status: 'SKIPPED', error: 'Server version is newer' })
              continue
            }

            // 3. Perform update inside the transaction (directly updating status to skip API checks or use JobService rules)
            // Note: status check should follow standard transitions unless overridden. 
            // For offline sync updates, we let the status update complete if server wasn't modified
            await tx
              .update(jobs)
              .set({
                status,
                updatedAt: new Date(timestamp), // Keep client's actual timestamp
              })
              .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))

            results.push({ action: 'UPDATE_STATUS', status: 'SUCCESS' })
            syncedCount++

          } else if (item.action === 'CREATE_INVOICE') {
            const { invoiceId, jobId, items, timestamp } = item.payload

            // 1. Check if invoiceId is already saved to prevent duplicates
            const [existing] = await tx
              .select()
              .from(invoices)
              .where(eq(invoices.id, invoiceId))
              .limit(1)

            if (existing) {
              results.push({ action: 'CREATE_INVOICE', status: 'SKIPPED', error: 'Invoice already exists' })
              continue
            }

            // 2. Lock sequence counter per tradie
            let [seq] = await tx
              .select()
              .from(invoiceSequence)
              .where(eq(invoiceSequence.tradieId, tradieId))
              .for('update')

            let nextCounter = 1
            if (!seq) {
              await tx.insert(invoiceSequence).values({
                tradieId,
                counter: 1,
              })
            } else {
              nextCounter = seq.counter + 1
              await tx
                .update(invoiceSequence)
                .set({ counter: nextCounter })
                .where(eq(invoiceSequence.tradieId, tradieId))
            }

            // 3. Format sequential number
            const invoiceNumber = `INV-${String(nextCounter).padStart(4, '0')}`

            // 4. Totals calculations
            let subtotalCents = 0
            const calculatedItems = items.map((item: any, idx: number) => {
              const unitPriceCents = item.unitPriceCents ?? item.unitPrice
              const lineTotalCents = Math.round(item.quantity * unitPriceCents)
              subtotalCents += lineTotalCents
              return {
                description: item.description,
                qty: item.quantity.toString(),
                unitPriceCents,
                lineTotalCents,
                sortOrder: idx,
              }
            })

            const gstCalc = GSTService.calculateFromSubtotal(subtotalCents)

            // 5. Insert invoice with the client-provided offline invoiceId
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

            // 6. Insert items
            await tx.insert(invoiceItems).values(
              calculatedItems.map((item: any) => ({
                ...item,
                invoiceId,
                createdAt: new Date(timestamp),
              }))
            )

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
            results.push({ action: 'CREATE_JOB', status: 'SUCCESS' })
            syncedCount++
          } else if (item.action === 'PAY_INVOICE') {
            const { invoiceId, signatureData, timestamp } = item.payload
            await tx
              .update(invoices)
              .set({
                status: 'PAID',
                signatureData,
                signedAt: new Date(timestamp),
                paidAt: new Date(timestamp),
                updatedAt: new Date(timestamp),
              })
              .where(and(eq(invoices.id, invoiceId), eq(invoices.tradieId, tradieId)))

            results.push({ action: 'PAY_INVOICE', status: 'SUCCESS' })
            syncedCount++
          } else {
            results.push({ action: item.action, status: 'FAILED', error: 'Action not supported' })
          }
        } catch (err: any) {
          console.error(`Sync item failed: ${item.action}`, err)
          results.push({ action: item.action, status: 'FAILED', error: err.message })
        }
      }
    })

    return {
      success: true,
      data: {
        syncedCount,
        results,
      },
    }
  })
}
