import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { env } from '../../config/env'
import { supabaseAdmin } from '../../config/supabase'

const stripe = new Stripe(env.STRIPE_SECRET_KEY)

export async function stripeWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const sig = request.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      request.body as string | Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    return reply.status(400).send(`Webhook Error: ${err.message}`)
  }

  // Return 200 immediately (within 10s)
  reply.status(200).send({ received: true })

  // Process asynchronously
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object as Stripe.PaymentIntent
      await handlePaymentSuccess(paymentIntent)
      break
    case 'payment_intent.payment_failed':
      // Log failure + notify tradie via FCM
      break
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const invoiceId = paymentIntent.metadata.invoice_id
  if (!invoiceId) return

  // 1. Mark invoice PAID
  await supabaseAdmin
    .from('invoices')
    .update({
      status: 'PAID',
      paid_at: new Date().toISOString(),
      stripe_payment_intent_id: paymentIntent.id
    })
    .eq('id', invoiceId)

  // 2. Queue Xero sync (BullMQ) - placeholder
  // xeroQueue.add('sync-invoice', { invoiceId })

  // 3. Send FCM push
  // notificationService.sendPaymentReceived(invoiceId)
}
