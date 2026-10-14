import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryChain } from '../helpers/query-chain'

vi.mock('../../src/config/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))
vi.mock('../../src/config/stripe', () => ({
  stripe: { paymentIntents: { retrieve: vi.fn() } },
}))
vi.mock('../../src/services/storage.service', () => ({
  StorageService: { uploadSignature: vi.fn() },
}))
vi.mock('../../src/services/notification.service', () => ({
  NotificationService: { notifyTradie: vi.fn() },
}))

import { db } from '../../src/config/db'
import { stripe } from '../../src/config/stripe'
import { NotificationService } from '../../src/services/notification.service'
import { PaymentService } from '../../src/services/payment.service'

const unpaid = {
  id: 'inv-1',
  tradieId: 'tradie-1',
  invoiceNumber: 'INV-0007',
  status: 'SENT',
  totalCents: 22000,
  stripePaymentIntentId: null,
  signatureUrl: null,
  signatureData: null,
  signedAt: null,
}

function mockInvoiceLookup(invoice: unknown) {
  vi.mocked(db.select).mockReturnValueOnce(queryChain(invoice ? [invoice] : []) as any)
}

describe('PaymentService.markInvoicePaid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue(queryChain(undefined) as any)
  })

  it('marks a card payment paid, records the event and notifies the tradie', async () => {
    mockInvoiceLookup(unpaid)
    vi.mocked(db.update).mockReturnValueOnce(queryChain([{ ...unpaid, status: 'PAID' }]) as any)

    const result = await PaymentService.markInvoicePaid({
      invoiceId: 'inv-1',
      tradieId: 'tradie-1',
      paymentMethod: 'STRIPE_TAP_TO_PAY',
      stripePaymentIntentId: 'pi_1',
      source: 'webhook',
      eventType: 'webhook_succeeded',
    })

    expect(result.status).toBe('PAID')
    expect(db.insert).toHaveBeenCalledTimes(1) // payment event
    expect(NotificationService.notifyTradie).toHaveBeenCalledWith('tradie-1', expect.objectContaining({
      type: 'PAYMENT_RECEIVED',
      body: expect.stringContaining('INV-0007'),
    }))
  })

  it('does not push for cash the tradie recorded themselves', async () => {
    mockInvoiceLookup(unpaid)
    vi.mocked(db.update).mockReturnValueOnce(queryChain([{ ...unpaid, status: 'PAID' }]) as any)

    await PaymentService.markInvoicePaid({
      invoiceId: 'inv-1',
      tradieId: 'tradie-1',
      paymentMethod: 'CASH',
      source: 'client',
      eventType: 'offline_cash_recorded',
    })

    expect(NotificationService.notifyTradie).not.toHaveBeenCalled()
  })

  it('does nothing more when a concurrent request already marked it paid', async () => {
    mockInvoiceLookup(unpaid)
    vi.mocked(db.update).mockReturnValueOnce(queryChain([]) as any) // lost the race
    mockInvoiceLookup({ ...unpaid, status: 'PAID' })

    const result = await PaymentService.markInvoicePaid({
      invoiceId: 'inv-1',
      tradieId: 'tradie-1',
      paymentMethod: 'STRIPE_TAP_TO_PAY',
      source: 'client',
      eventType: 'client_confirmed',
    })

    expect(result.status).toBe('PAID')
    expect(db.insert).not.toHaveBeenCalled()
    expect(NotificationService.notifyTradie).not.toHaveBeenCalled()
  })

  it('rejects an invoice owned by another tradie', async () => {
    mockInvoiceLookup(null)

    await expect(PaymentService.markInvoicePaid({
      invoiceId: 'inv-1',
      tradieId: 'someone-else',
      paymentMethod: 'CASH',
      source: 'client',
      eventType: 'offline_cash_recorded',
    })).rejects.toThrow(/not found/i)
    expect(db.update).not.toHaveBeenCalled()
  })
})

describe('PaymentService.confirmStripePayment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue(queryChain(undefined) as any)
  })

  it('refuses to mark paid when Stripe says the payment did not succeed', async () => {
    mockInvoiceLookup(unpaid)
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      status: 'requires_payment_method',
      metadata: { invoiceId: 'inv-1' },
    } as any)

    await expect(PaymentService.confirmStripePayment('tradie-1', 'inv-1', 'pi_1'))
      .rejects.toThrow(/not complete/)
    expect(db.update).not.toHaveBeenCalled()
  })

  it('refuses a PaymentIntent that belongs to a different invoice', async () => {
    mockInvoiceLookup(unpaid)
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      status: 'succeeded',
      metadata: { invoiceId: 'inv-other' },
    } as any)

    await expect(PaymentService.confirmStripePayment('tradie-1', 'inv-1', 'pi_1'))
      .rejects.toThrow(/does not match/)
    expect(db.update).not.toHaveBeenCalled()
  })

  it('marks paid once Stripe confirms success', async () => {
    mockInvoiceLookup(unpaid) // confirmStripePayment lookup
    mockInvoiceLookup(unpaid) // markInvoicePaid lookup
    vi.mocked(stripe.paymentIntents.retrieve).mockResolvedValueOnce({
      status: 'succeeded',
      metadata: { invoiceId: 'inv-1' },
    } as any)
    vi.mocked(db.update).mockReturnValueOnce(queryChain([{ ...unpaid, status: 'PAID' }]) as any)

    const result = await PaymentService.confirmStripePayment('tradie-1', 'inv-1', 'pi_1')

    expect(result.alreadyPaid).toBe(false)
    expect(result.invoice.status).toBe('PAID')
  })
})
