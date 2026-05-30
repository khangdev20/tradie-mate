import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { invoices } from '../../db/schema/invoices'
import { eq, and } from 'drizzle-orm'
import { StripeService } from '../../services/stripe.service'
import { EntitlementService } from '../../services/entitlement.service'
import { AppError } from '../../utils/errors'

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  // 1. Get Connection Token for Stripe Terminal SDK
  fastify.post('/connection-token', async (request, reply) => {
    // Check if the user is allowed to use Tap to Pay
    await EntitlementService.requireEntitlement(request.tradie.id, 'tapToPayEnabled')

    const secret = await StripeService.createConnectionToken()
    return {
      success: true,
      data: { secret },
    }
  })

  // 2. Generate PaymentIntent for Tap to Pay
  fastify.post('/tap-to-pay', async (request: FastifyRequest<{
    Body: { invoiceId: string }
  }>, reply) => {
    const { invoiceId } = request.body
    const tradieId = request.tradie.id

    if (!invoiceId) {
      throw new AppError('Invoice ID is required.', 400)
    }

    // A. Check entitlement
    await EntitlementService.requireEntitlement(tradieId, 'tapToPayEnabled')

    // B. Check ownership and retrieve invoice
    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.tradieId, tradieId)))
      .limit(1)

    if (!invoice) {
      throw new AppError('Invoice not found or access denied', 404)
    }

    if (invoice.status === 'PAID') {
      throw new AppError('Invoice is already paid.', 400)
    }

    // C. Create PaymentIntent
    const pi = await StripeService.createPaymentIntent(invoice.totalCents, invoice.id)

    // D. Cache stripe payment intent on invoice
    await db
      .update(invoices)
      .set({
        stripePaymentIntentId: pi.paymentIntentId,
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, invoiceId))

    return {
      success: true,
      data: pi,
    }
  })
}
