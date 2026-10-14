import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryChain } from '../helpers/query-chain'

vi.mock('../../src/config/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn() },
}))
vi.mock('../../src/config/firebase', () => ({
  fcm: { sendEachForMulticast: vi.fn() },
}))

import { db } from '../../src/config/db'
import { fcm } from '../../src/config/firebase'
import { NotificationService, toFcmData } from '../../src/services/notification.service'

function mockTokens(deviceTokens: string[], legacyToken: string | null) {
  vi.mocked(db.select)
    .mockReturnValueOnce(queryChain(deviceTokens.map((token) => ({ token }))) as any)
    .mockReturnValueOnce(queryChain([{ fcmToken: legacyToken }]) as any)
}

describe('toFcmData', () => {
  it('stringifies values and drops empty ones', () => {
    expect(toFcmData({ a: 1, b: true, c: null, d: undefined, e: 'x' }))
      .toEqual({ a: '1', b: 'true', e: 'x' })
  })
})

describe('NotificationService.notifyTradie', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.insert).mockReturnValue(queryChain([{ id: 'notif-1' }]) as any)
    vi.mocked(db.update).mockReturnValue(queryChain(undefined) as any)
    vi.mocked(db.delete).mockReturnValue(queryChain(undefined) as any)
  })

  const notification = {
    type: 'PAYMENT_RECEIVED' as const,
    title: 'Payment received',
    body: '$220.00 paid for INV-0007',
    data: { invoiceId: 'inv-1' },
  }

  it('pushes to every device once, including the legacy token', async () => {
    mockTokens(['tok-a', 'tok-b'], 'tok-b')
    vi.mocked(fcm.sendEachForMulticast).mockResolvedValueOnce({
      successCount: 2,
      failureCount: 0,
      responses: [{ success: true, messageId: 'm1' }, { success: true, messageId: 'm2' }],
    } as any)

    const result = await NotificationService.notifyTradie('tradie-1', notification)

    expect(result.sent).toBe(2)
    const message = vi.mocked(fcm.sendEachForMulticast).mock.calls[0][0]
    expect(message.tokens).toEqual(['tok-a', 'tok-b'])
    expect(message.data).toMatchObject({ type: 'PAYMENT_RECEIVED', invoiceId: 'inv-1', notificationId: 'notif-1' })
    expect(db.delete).not.toHaveBeenCalled()
  })

  it('removes tokens FCM reports as unregistered', async () => {
    mockTokens(['tok-dead', 'tok-ok'], null)
    vi.mocked(fcm.sendEachForMulticast).mockResolvedValueOnce({
      successCount: 1,
      failureCount: 1,
      responses: [
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: true, messageId: 'm1' },
      ],
    } as any)

    await NotificationService.notifyTradie('tradie-1', notification)

    expect(db.delete).toHaveBeenCalledTimes(1)
  })

  it('still stores the notification when the tradie has no devices', async () => {
    mockTokens([], null)

    const result = await NotificationService.notifyTradie('tradie-1', notification)

    expect(result.sent).toBe(0)
    expect(db.insert).toHaveBeenCalledTimes(1)
    expect(fcm.sendEachForMulticast).not.toHaveBeenCalled()
  })

  it('never throws when FCM fails', async () => {
    mockTokens(['tok-a'], null)
    vi.mocked(fcm.sendEachForMulticast).mockRejectedValueOnce(new Error('FCM down'))

    await expect(NotificationService.notifyTradie('tradie-1', notification)).resolves.toEqual({ sent: 0 })
  })
})
