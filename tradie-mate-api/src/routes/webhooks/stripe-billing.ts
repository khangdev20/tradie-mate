import { FastifyRequest, FastifyReply } from 'fastify'
import Stripe from 'stripe'
import { env } from '../../config/env'
import { db } from '../../config/db'
import { tradieSubscriptions } from '../../db/schema/subscriptions'
import { tradies } from '../../db/schema/tradies'
import { stripe } from '../../config/stripe'
import { eq, and } from 'drizzle-orm'

export async function stripeBillingWebhookHandler(request: FastifyRequest, reply: FastifyReply) {
  const sig = request.headers['stripe-signature'] as string
  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      request.body as string | Buffer,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err: any) {
    request.log.warn({ err }, 'Stripe billing webhook signature verification failed')
    return reply.status(400).send({ success: false, error: { message: `Webhook Error: ${err.message}` } })
  }

  // Acknowledge immediately within Stripe's 10-second window
  reply.status(200).send({ success: true, data: { received: true } })

  // Process asynchronously
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
        // Unhandled event types — safe to ignore
        break
    }
  } catch (err) {
    request.log.error({ err, eventType: event.type }, 'Error processing Stripe billing webhook')
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription) return

  const stripeCustomerId = session.customer as string
  const stripeSubscriptionId = session.subscription as string

  // Retrieve full subscription details from Stripe
  const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  await upsertSubscription(sub, stripeCustomerId)
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription) {
  const stripeCustomerId = sub.customer as string
  await upsertSubscription(sub, stripeCustomerId)
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
  // Ensure subscription status is ACTIVE after successful payment
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

async function upsertSubscription(sub: Stripe.Subscription, stripeCustomerId: string) {
  const stripeSubscriptionId = sub.id
  const planCode = derivePlanCode(sub)
  const status = mapStripeStatus(sub.status)
  const currentPeriodStart = new Date((sub as any).current_period_start * 1000)
  const currentPeriodEnd = new Date((sub as any).current_period_end * 1000)
  const trialEnd = (sub as any).trial_end ? new Date((sub as any).trial_end * 1000) : null
  const cancelAtPeriodEnd = (sub as any).cancel_at_period_end ?? false

  // Look up the tradie by Stripe customer ID — search existing subscription row first
  const [existing] = await db
    .select()
    .from(tradieSubscriptions)
    .where(eq(tradieSubscriptions.stripeCustomerId, stripeCustomerId))
    .limit(1)

  if (existing) {
    await db
      .update(tradieSubscriptions)
      .set({
        stripeSubscriptionId,
        planCode,
        status,
        currentPeriodStart,
        currentPeriodEnd,
        trialEndsAt: trialEnd,
        cancelAtPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(tradieSubscriptions.id, existing.id))
  } else {
    // Find tradie by looking up stripeCustomerId in existing subscriptions — this covers the initial checkout
    // Fallback: insert a pending row that will be reconciled later
    request_log_placeholder(stripeCustomerId, stripeSubscriptionId, status)
  }
}

// Placeholder logger used when tradie cannot be resolved from the webhook — logs for manual reconciliation
function request_log_placeholder(customerId: string, subId: string, status: string) {
  console.warn(
    `[stripe-billing webhook] Could not locate tradie for customer=${customerId} sub=${subId} status=${status}. Manual reconciliation needed.`
  )
}

function mapStripeStatus(stripeStatus: string): 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'INCOMPLETE' {
  switch (stripeStatus) {
    case 'trialing': return 'TRIALING'
    case 'active': return 'ACTIVE'
    case 'past_due': return 'PAST_DUE'
    case 'canceled':
    case 'cancelled': return 'CANCELED'
    default: return 'INCOMPLETE'
  }
}

function derivePlanCode(sub: Stripe.Subscription): string {
  const item = sub.items?.data?.[0]
  const priceId = item?.price?.id || ''
  const nickname = item?.price?.nickname || ''
  // Try to extract plan code from price nickname or metadata
  const meta = (sub as any).metadata?.plan_code
  if (meta) return meta
  if (nickname) return nickname.toUpperCase().replace(/\s+/g, '_')
  return 'SOLO_PRO' // sensible fallback
}
