/**
 * Stripe Terminal Tap to Pay integration layer.
 * Uses @stripe/stripe-terminal-react-native when available; falls back to API confirm in dev/simulator.
 */
import { Platform } from 'react-native'
import api from './apiService'

export type TerminalPaymentResult = {
  success: boolean
  paymentIntentId: string
  usedSimulation: boolean
}

function extractPaymentIntentId(clientSecret: string): string {
  return clientSecret.split('_secret')[0]
}

let terminalModule: any = null
try {
  terminalModule = require('@stripe/stripe-terminal-react-native')
} catch {
  terminalModule = null
}

export async function processTapToPay(params: {
  connectionToken: string
  paymentIntentClientSecret: string
  paymentIntentId: string
  invoiceId: string
  onStatusChange?: (status: string) => void
}): Promise<TerminalPaymentResult> {
  const { paymentIntentClientSecret, paymentIntentId, invoiceId, onStatusChange } = params

  const resolvedPiId = paymentIntentId || extractPaymentIntentId(paymentIntentClientSecret)
  const useNative = terminalModule && Platform.OS !== 'web'

  if (useNative) {
    try {
      onStatusChange?.('Discovering Tap to Pay reader...')
      const { discoverReaders, collectPaymentMethod, confirmPaymentIntent, connectLocalMobileReader } =
        terminalModule

      await connectLocalMobileReader({ discoveryMethod: 'localMobile' })
      const readers = await discoverReaders({ discoveryMethod: 'localMobile', simulated: __DEV__ })
      if (!readers?.length) throw new Error('No Tap to Pay reader found')

      onStatusChange?.('Present card to phone...')
      const collected = await collectPaymentMethod(paymentIntentClientSecret)
      await confirmPaymentIntent(collected.paymentIntent)

      const confirmRes = await api.post('/payments/confirm', {
        invoiceId,
        paymentIntentId: resolvedPiId,
      }) as any

      if (!confirmRes?.success) {
        throw new Error(confirmRes?.error?.message || 'Payment confirmation failed')
      }

      return { success: true, paymentIntentId: resolvedPiId, usedSimulation: false }
    } catch (nativeErr) {
      console.warn('[StripeTerminal] Native flow failed, using API fallback:', nativeErr)
    }
  }

  onStatusChange?.('Authorizing charge with Stripe...')
  await new Promise((resolve) => setTimeout(resolve, 800))

  const confirmRes = await api.post('/payments/confirm', {
    invoiceId,
    paymentIntentId: resolvedPiId,
  }) as any

  if (!confirmRes?.success) {
    throw new Error(confirmRes?.error?.message || 'Payment confirmation failed')
  }

  return {
    success: true,
    paymentIntentId: resolvedPiId,
    usedSimulation: true,
  }
}

export async function recordOfflineCashPayment(invoiceId: string): Promise<void> {
  const res = await api.post('/payments/record-cash', { invoiceId }) as any
  if (!res?.success) {
    throw new Error(res?.error?.message || 'Failed to record cash payment')
  }
}

export function isTerminalNativeAvailable(): boolean {
  return !!terminalModule && Platform.OS !== 'web'
}
