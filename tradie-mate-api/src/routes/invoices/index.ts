import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { invoices, invoiceItems, invoiceSequence } from '../../db/schema/invoices'
import { eq, and, desc } from 'drizzle-orm'
import { EntitlementService } from '../../services/entitlement.service'
import { GSTService } from '../../services/gst.service'
import { AppError } from '../../utils/errors'

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireOnboarded)

  // 0. List invoices for tradie
  fastify.get<{ Querystring: { status?: string; limit?: number; offset?: number } }>('/', async (request) => {
    const { status, limit = 50, offset = 0 } = request.query
    const tradieId = request.tradie.id

    const conditions = [eq(invoices.tradieId, tradieId)]
    if (status) {
      conditions.push(eq(invoices.status, status as any))
    }

    const invoiceList = await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        status: invoices.status,
        subtotalCents: invoices.subtotalCents,
        gstCents: invoices.gstCents,
        totalCents: invoices.totalCents,
        jobId: invoices.jobId,
        customerId: invoices.customerId,
        dueAt: invoices.dueAt,
        paidAt: invoices.paidAt,
        signedAt: invoices.signedAt,
        createdAt: invoices.createdAt,
        updatedAt: invoices.updatedAt,
      })
      .from(invoices)
      .where(and(...conditions))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      success: true,
      data: {
        invoices: invoiceList,
        meta: {
          total: invoiceList.length,
          limit,
          offset,
        },
      },
    }
  })


  fastify.post('/', async (request: FastifyRequest<{
    Body: {
      jobId: string
      customerId?: string
      items: { description: string; quantity: number; unitPriceCents: number; unit?: string }[]
    }
  }>, reply) => {
    const tradieId = request.tradie.id
    const { jobId, customerId, items } = request.body

    if (!jobId || !items || items.length === 0) {
      throw new AppError('Job ID and invoice items are required.', 400)
    }

    // A. Check subscription limits
    await EntitlementService.requireUsageLimit(tradieId, 'invoicesCreated', 'maxInvoicesPerMonth')

    let newInvoice: any

    // B. Run atomic transaction
    await db.transaction(async (tx) => {
      // 1. Lock sequence counter per tradie
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

      // 2. Format invoice number (left padded to 4 digits: e.g. INV-0001)
      const invoiceNumber = `INV-${String(nextCounter).padStart(4, '0')}`

      // 3. Calculate financial totals in integer cents
      let subtotalCents = 0
      const calculatedItems = items.map((item, idx) => {
        const lineTotalCents = Math.round(item.quantity * item.unitPriceCents)
        subtotalCents += lineTotalCents
        return {
          description: item.description,
          qty: item.quantity.toString(), // decimals stored as string/decimal in Drizzle
          unitPriceCents: item.unitPriceCents,
          lineTotalCents,
          unit: item.unit ?? 'item',
          sortOrder: idx,
        }
      })

      const gstCalc = GSTService.calculateFromSubtotal(subtotalCents)

      // 4. Create invoice
      const [invoice] = await tx
        .insert(invoices)
        .values({
          tradieId,
          jobId,
          customerId: customerId ?? null,
          invoiceNumber,
          invoicePrefix: 'INV',
          sequenceNumber: nextCounter,
          status: 'DRAFT',
          subtotalCents,
          gstCents: gstCalc.gst,
          totalCents: gstCalc.total,
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      newInvoice = invoice

      // 5. Create invoice items
      await tx.insert(invoiceItems).values(
        calculatedItems.map((item) => ({
          ...item,
          invoiceId: invoice.id,
          createdAt: new Date(),
        }))
      )
    })

    // C. Increment subscription usage counter
    await EntitlementService.incrementUsage(tradieId, 'invoicesCreated')

    return reply.status(201).send({
      success: true,
      data: newInvoice,
    })
  })

  // 2. Mark Invoice as Paid (with digital signature capture)
  fastify.patch('/:id/paid', async (request: FastifyRequest<{
    Params: { id: string }
    Body: { signatureData: string }
  }>) => {
    const { id } = request.params
    const { signatureData } = request.body
    const tradieId = request.tradie.id

    if (!signatureData) {
      throw new AppError('Signature data is required.', 400)
    }

    // A. Check ownership
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tradieId, tradieId)))
      .limit(1)

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404)
    }

    // B. Save base64 signature and update status to PAID
    const [updated] = await db
      .update(invoices)
      .set({
        status: 'PAID',
        signatureData,
        signedAt: new Date(),
        paidAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, id))
      .returning()

    return {
      success: true,
      data: {
        invoiceId: updated.id,
        status: updated.status,
        signedAt: updated.signedAt,
      },
    }
  })
}
