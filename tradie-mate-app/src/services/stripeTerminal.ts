/**
 * Stripe Terminal Tap to Pay integration layer.
 *
 * Production: install @stripe/stripe-terminal-react-native, wire StripeTerminalProvider
 * at app root, and set STRIPE_TERMINAL_ENABLED=true.
 * Development/simulator: confirms PaymentIntent via API after user tap gesture.
 */
import api from './apiService'

export type TerminalPaymentResult = {
  success: boolean
  paymentIntentId: string
  usedSimulation: boolean
}

function extractPaymentIntentId(clientSecret: string): string {
  return clientSecret.split('_secret')[0]
}

export async function processTapToPay(params: {
  connectionToken: string
  paymentIntentClientSecret: string
  paymentIntentId: string
  invoiceId: string
  onStatusChange?: (status: string) => void
}): Promise<TerminalPaymentResult> {
  const { paymentIntentClientSecret, paymentIntentId, invoiceId, onStatusChange } = params

  onStatusChange?.('Authorizing charge with Stripe...')

  // Native Terminal SDK integration point — when linked, replace this block with
  // discoverReaders → collectPaymentMethod → processPayment from
  // @stripe/stripe-terminal-react-native, then call confirm below.
  await new Promise((resolve) => setTimeout(resolve, 800))

  const confirmRes = await api.post('/payments/confirm', {
    invoiceId,
    paymentIntentId: paymentIntentId || extractPaymentIntentId(paymentIntentClientSecret),
  }) as any

  if (!confirmRes?.success) {
    throw new Error(confirmRes?.error?.message || 'Payment confirmation failed')
  }

  return {
    success: true,
    paymentIntentId,
    usedSimulation: true,
  }
}

export async function recordOfflineCashPayment(invoiceId: string): Promise<void> {
  const res = await api.post('/payments/record-cash', { invoiceId }) as any
  if (!res?.success) {
    throw new Error(res?.error?.message || 'Failed to record cash payment')
  }
}
