import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryChain } from '../helpers/query-chain'

vi.mock('../../src/config/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))
vi.mock('../../src/services/notification.service', () => ({
  NotificationService: { notifyTradie: vi.fn() },
}))

import { db } from '../../src/config/db'
import { NotificationService } from '../../src/services/notification.service'
import {
  DocumentExpiryService,
  getDueExpiryReminder,
  inferLicenceState,
} from '../../src/services/document-expiry.service'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-14T00:00:00Z')
const inDays = (days: number) => new Date(now.getTime() + days * DAY)

const doc = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  tradieId: 'tradie-1',
  docType: 'TRADE_LICENCE',
  status: 'VERIFIED',
  issuingAuthority: 'QBCC',
  docNumber: '1234567',
  expiresAt: inDays(45),
  expiry60DaySentAt: null,
  expiry30DaySentAt: null,
  expiry7DaySentAt: null,
  ...overrides,
})

describe('getDueExpiryReminder', () => {
  it.each([
    [90, null],
    [45, 'DAYS_60'],
    [20, 'DAYS_30'],
    [5, 'DAYS_7'],
    [0, 'EXPIRED'],
    [-3, 'EXPIRED'],
  ])('%i days left → %s', (days, expected) => {
    expect(getDueExpiryReminder(doc({ expiresAt: inDays(days as number) }), now)).toBe(expected)
  })

  it('does not resend a stage that was already sent', () => {
    expect(getDueExpiryReminder(doc({ expiresAt: inDays(20), expiry30DaySentAt: inDays(-5) }), now)).toBeNull()
  })

  it('never sends an earlier stage after a later one', () => {
    expect(getDueExpiryReminder(doc({ expiresAt: inDays(45), expiry7DaySentAt: inDays(-1) }), now)).toBeNull()
  })

  it('ignores documents that are not active', () => {
    expect(getDueExpiryReminder(doc({ status: 'PENDING', expiresAt: inDays(5) }), now)).toBeNull()
    expect(getDueExpiryReminder(doc({ expiresAt: null }), now)).toBeNull()
  })
})

describe('inferLicenceState', () => {
  it.each([
    ['QBCC', 'QLD'],
    ['NSW Fair Trading', 'NSW'],
    ['Victorian Building Authority (VBA)', 'VIC'],
    ['Consumer and Business Services', 'SA'],
    ['Building and Energy WA', 'WA'],
    [null, null],
    ['Unknown body', null],
  ])('%s → %s', (authority, state) => {
    expect(inferLicenceState(authority)).toBe(state)
  })

  it('does not match "SA" inside other words', () => {
    expect(inferLicenceState('Safety Council')).toBeNull()
  })
})

describe('DocumentExpiryService.runNightlyChecks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.update).mockReturnValue(queryChain(undefined) as any)
    vi.mocked(db.insert).mockReturnValue(queryChain([{ id: 'run-1' }]) as any)
  })

  it('sends the due reminder and queues a registry check for the licence', async () => {
    vi.mocked(db.select).mockReturnValueOnce(queryChain([doc()]) as any)
    const enqueue = vi.fn().mockResolvedValue(undefined)

    const summary = await DocumentExpiryService.runNightlyChecks(enqueue, now)

    expect(summary).toEqual({ scanned: 1, reminders: 1, licenceChecks: 1 })
    expect(NotificationService.notifyTradie).toHaveBeenCalledWith('tradie-1', expect.objectContaining({ type: 'DOC_EXPIRING' }))
    expect(enqueue).toHaveBeenCalledWith({
      runId: 'run-1',
      tradieId: 'tradie-1',
      documentId: 'doc-1',
      docType: 'TRADE_LICENCE',
      state: 'QLD',
      licenceNumber: '1234567',
    })
  })

  it('marks an expired document and skips registry checks it cannot run', async () => {
    vi.mocked(db.select).mockReturnValueOnce(queryChain([
      doc({ docType: 'PUBLIC_LIABILITY_INSURANCE', expiresAt: inDays(-1), issuingAuthority: null }),
    ]) as any)
    const enqueue = vi.fn()

    const summary = await DocumentExpiryService.runNightlyChecks(enqueue, now)

    expect(summary.licenceChecks).toBe(0)
    expect(enqueue).not.toHaveBeenCalled()
    expect(NotificationService.notifyTradie).toHaveBeenCalledWith('tradie-1', expect.objectContaining({ type: 'DOC_EXPIRED' }))
  })
})
