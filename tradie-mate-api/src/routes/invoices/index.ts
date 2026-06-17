import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { invoices, invoiceItems, invoiceSequence } from '../../db/schema/invoices'
import { eq, and } from 'drizzle-orm'
import { EntitlementService } from '../../services/entitlement.service'
import { GSTService } from '../../services/gst.service'
import { PaymentService } from '../../services/payment.service'
import { AppError } from '../../utils/errors'
import { generateInvoicePdf } from '../../services/pdf.service'
import { tradies } from '../../db/schema/tradies'

function validateSignatureData(signatureData: string) {
  const stripped = signatureData.replace(/^data:image\/\w+;base64,/, '')
  if (stripped.length < 200) {
    throw new AppError(
      'Signature is too short. Please ask the customer to sign again.',
      400,
      'INVALID_SIGNATURE'
    )
  }
}

export async function invoiceRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  // 1. Create Invoice (Sequential + Transaction)
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

    await EntitlementService.requireUsageLimit(tradieId, 'invoicesCreated', 'maxInvoicesPerMonth')

    let newInvoice: any

    await db.transaction(async (tx) => {
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

      const invoiceNumber = `INV-${String(nextCounter).padStart(4, '0')}`

      let subtotalCents = 0
      const calculatedItems = items.map((item, idx) => {
        const lineTotalCents = Math.round(item.quantity * item.unitPriceCents)
        subtotalCents += lineTotalCents
        return {
          description: item.description,
          qty: item.quantity.toString(),
          unitPriceCents: item.unitPriceCents,
          lineTotalCents,
          unit: item.unit ?? 'item',
          sortOrder: idx,
        }
      })

      const gstCalc = GSTService.calculateFromSubtotal(subtotalCents)

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
          dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning()

      newInvoice = invoice

      await tx.insert(invoiceItems).values(
        calculatedItems.map((item) => ({
          ...item,
          invoiceId: invoice.id,
          createdAt: new Date(),
        }))
      )
    })

    await EntitlementService.incrementUsage(tradieId, 'invoicesCreated')

    // Generate PDF (best-effort)
    try {
      const [tradie] = await db
        .select({ firstName: tradies.firstName, lastName: tradies.lastName, abn: tradies.abn })
        .from(tradies)
        .where(eq(tradies.id, tradieId))
        .limit(1)

      const items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, newInvoice.id))

      const { pdfUrl } = await generateInvoicePdf({
        invoiceId: newInvoice.id,
        tradieId,
        invoiceNumber: newInvoice.invoiceNumber,
        tradieName: `${tradie?.firstName ?? ''} ${tradie?.lastName ?? ''}`.trim(),
        abn: tradie?.abn,
        items: items.map((i) => ({
          description: i.description,
          quantity: i.qty,
          unitPriceCents: i.unitPriceCents,
          lineTotalCents: i.lineTotalCents,
        })),
        subtotalCents: newInvoice.subtotalCents,
        gstCents: newInvoice.gstCents,
        totalCents: newInvoice.totalCents,
        dueAt: newInvoice.dueAt,
      })

      await db
        .update(invoices)
        .set({ pdfUrl, pdfGeneratedAt: new Date(), updatedAt: new Date() })
        .where(eq(invoices.id, newInvoice.id))

      newInvoice.pdfUrl = pdfUrl
    } catch (pdfErr) {
      fastify.log.warn({ pdfErr, invoiceId: newInvoice.id }, 'Invoice PDF generation failed')
    }

    return reply.status(201).send({
      success: true,
      data: newInvoice,
    })
  })

  /** GET /invoices/:id/pdf — regenerate or return PDF URL */
  fastify.get('/:id/pdf', async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const tradieId = request.tradie.id
    const { id } = request.params

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, id), eq(invoices.tradieId, tradieId)))
      .limit(1)

    if (!invoice) throw new AppError('Invoice not found.', 404, 'INVOICE_NOT_FOUND')
    if (invoice.pdfUrl) {
      return { success: true, data: { pdfUrl: invoice.pdfUrl } }
    }

    throw new AppError('PDF not yet generated.', 404, 'PDF_NOT_FOUND')
  })

  // 2. Mark Invoice as Paid (with digital signature capture)
  fastify.patch('/:id/paid', async (request: FastifyRequest<{
    Params: { id: string }
    Body: { signatureData: string; paymentMethod?: 'CASH' | 'STRIPE_TAP_TO_PAY' }
  }>) => {
    const { id } = request.params
    const { signatureData, paymentMethod = 'STRIPE_TAP_TO_PAY' } = request.body
    const tradieId = request.tradie.id

    if (!signatureData) {
      throw new AppError('Signature data is required.', 400, 'VALIDATION_ERROR')
    }

    validateSignatureData(signatureData)

    const updated = await PaymentService.markInvoicePaid({
      invoiceId: id,
      tradieId,
      paymentMethod,
      signatureData,
      source: 'client',
      eventType: paymentMethod === 'CASH' ? 'offline_cash_recorded' : 'client_confirmed',
    })

    return {
      success: true,
      data: {
        invoiceId: updated.id,
        status: updated.status,
        signedAt: updated.signedAt,
        signatureUrl: updated.signatureUrl,
      },
    }
  })
}
