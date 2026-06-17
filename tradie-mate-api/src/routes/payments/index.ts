import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { eq, and } from 'drizzle-orm'
import { StripeService } from '../../services/stripe.service'
import { EntitlementService } from '../../services/entitlement.service'
import { PaymentService } from '../../services/payment.service'
import { AppError } from '../../utils/errors'

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/connection-token', async (request) => {
    await EntitlementService.requireEntitlement(request.tradie.id, 'tapToPayEnabled')

    const secret = await StripeService.createConnectionToken()
    return {
      success: true,
      data: { secret },
    }
  })

  fastify.post('/tap-to-pay', async (request: FastifyRequest<{
    Body: { invoiceId: string }
  }>) => {
    const { invoiceId } = request.body
    const tradieId = request.tradie.id

    if (!invoiceId) {
      throw new AppError('Invoice ID is required.', 400, 'VALIDATION_ERROR')
    }

    await EntitlementService.requireEntitlement(tradieId, 'tapToPayEnabled')

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tradieId, tradieId)))
      .limit(1)

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404, 'INVOICE_NOT_FOUND')
    }

    if (invoice.status === 'PAID') {
      throw new AppError('Invoice is already paid.', 400, 'INVOICE_ALREADY_PAID')
    }

    const pi = await StripeService.createPaymentIntent(invoice.totalCents, invoice.id)

    await db
      .update(invoices)
      .set({
        stripePaymentIntentId: pi.paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))

    await PaymentService.recordEvent({
      invoiceId,
      tradieId,
      eventType: 'payment_intent_created',
      source: 'client',
      stripePaymentIntentId: pi.paymentIntentId,
    })

    return {
      success: true,
      data: pi,
    }
  })

  /** Client reconciliation after Stripe Terminal SDK completes a charge. */
  fastify.post('/confirm', async (request: FastifyRequest<{
    Body: { invoiceId: string; paymentIntentId: string }
  }>) => {
    const { invoiceId, paymentIntentId } = request.body
    const tradieId = request.tradie.id

    if (!invoiceId || !paymentIntentId) {
      throw new AppError('invoiceId and paymentIntentId are required.', 400, 'VALIDATION_ERROR')
    }

    await EntitlementService.requireEntitlement(tradieId, 'tapToPayEnabled')

    const result = await PaymentService.confirmStripePayment(tradieId, invoiceId, paymentIntentId)

    return {
      success: true,
      data: {
        invoiceId: result.invoice.id,
        status: result.invoice.status,
        alreadyPaid: result.alreadyPaid,
      },
    }
  })

  /** Record offline cash/check payment without Stripe. */
  fastify.post('/record-cash', async (request: FastifyRequest<{
    Body: { invoiceId: string }
  }>) => {
    const { invoiceId } = request.body
    const tradieId = request.tradie.id

    if (!invoiceId) {
      throw new AppError('Invoice ID is required.', 400, 'VALIDATION_ERROR')
    }

    const updated = await PaymentService.markInvoicePaid({
      invoiceId,
      tradieId,
      paymentMethod: 'CASH',
      source: 'offline_sync',
      eventType: 'offline_cash_recorded',
    })

    return {
      success: true,
      data: {
        invoiceId: updated.id,
        status: updated.status,
      },
    }
  })
}
