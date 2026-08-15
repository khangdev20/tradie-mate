import { FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { env } from '../../config/env'
import { db } from '../../config/db'
import { tradieSubscriptions } from '../../db/schema/subscriptions'
import { stripe } from '../../config/stripe'
import { eq } from 'drizzle-orm'
import {
  isBillingEventProcessed,
  markBillingEventProcessed,
  upsertTradieSubscription,
} from '../../services/billing-webhook.service'

export async function stripeBillingWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const sig = request.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      ((request as any).rawBody ?? request.body) as string | Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    request.log.warn({ err }, 'Stripe billing webhook signature verification failed')
    return reply.status(400).send({ success: false, error: { message: `Webhook Error: ${err.message}` } })
  }

  if (await isBillingEventProcessed(event.id)) {
    return reply.status(200).send({ success: true, data: { received: true, duplicate: true } })
  }

  reply.status(200).send({ success: true, data: { received: true } })

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        break
    }

    await markBillingEventProcessed(event.id)
  } catch (err) {
    request.log.error({ err, eventType: event.type }, 'Error processing Stripe billing webhook')
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return

  const stripeSubscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id

  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  await upsertTradieSubscription(sub, {
    tradieId: session.metadata?.tradieId ?? session.metadata?.tradie_id,
    planCode: session.metadata?.planCode ?? session.metadata?.plan_code,
  })
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  await upsertTradieSubscription(sub)
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await db
    .update(tradieSubscriptions)
    .set({
      status: 'CANCELED',
      cancelAtPeriodEnd: false,
      updatedAt: new Date(),
    })
    .where(eq(tradieSubscriptions.stripeSubscriptionId, sub.id))
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  await db
    .update(tradieSubscriptions)
    .set({
      status: 'ACTIVE',
      updatedAt: new Date(),
    })
    .where(eq(tradieSubscriptions.stripeSubscriptionId, invoice.subscription as string))
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return
  await db
    .update(tradieSubscriptions)
    .set({
      status: 'PAST_DUE',
      updatedAt: new Date(),
    })
    .where(eq(tradieSubscriptions.stripeSubscriptionId, invoice.subscription as string))
}
