import { stripe } from '../config/stripe'
import { AppError } from '../utils/errors'

export class StripeService {
  static async createConnectionToken() {
    try {
      const token = await stripe.terminal.connectionTokens.create()
      return token.secret
    } catch (err: any) {
      console.error('Failed to create Stripe Terminal connection token:', err)
      throw new AppError(
        err.message || 'Stripe returned an error when generating the terminal token.',
        502
      )
    }
  }

  static async createPaymentIntent(amountCents: number, invoiceId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'aud',
        payment_method_types: ['card_present'],
        capture_method: 'automatic',
        metadata: { invoiceId },
      })

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }
    } catch (err: any) {
      console.error('Failed to create Stripe PaymentIntent:', err)
      throw new AppError(err.message || 'Failed to create Stripe PaymentIntent.', 400)
    }
  }

  static async getOrCreateCustomer(email: string, name: string): Promise<string> {
    try {
      const customers = await stripe.customers.list({ email, limit: 1 })
      if (customers.data.length > 0) {
        return customers.data[0].id
      }

      const customer = await stripe.customers.create({
        email,
        name,
      })
      return customer.id
    } catch (err: any) {
      console.error('Failed to get/create customer:', err)
      throw new AppError(err.message || 'Stripe customer operation failed', 500)
    }
  }

  static async createCheckoutSession(
    stripePriceId: string,
    stripeCustomerId: string,
    successUrl: string,
    cancelUrl: string,
    metadata: { tradieId: string; planCode: string }
  ) {
    try {
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        metadata,
        subscription_data: { metadata },
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
      })

      return session.url
    } catch (err: any) {
      console.error('Failed to create checkout session:', err)
      throw new AppError(err.message || 'Stripe checkout session failed', 400)
    }
  }

  static async createPortalSession(stripeCustomerId: string, returnUrl: string) {
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: stripeCustomerId,
        return_url: returnUrl,
      })
      return session.url
    } catch (err: any) {
      console.error('Failed to create portal session:', err)
      throw new AppError(err.message || 'Stripe portal session failed', 400)
    }
  }
}
