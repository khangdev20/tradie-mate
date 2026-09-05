import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/db', () => {
  const chain: any = { from: () => chain, where: () => chain, limit: vi.fn() }
  return {
    db: {
      select: () => chain,
      insert: vi.fn(),
      update: vi.fn(),
    },
  }
})

vi.mock('../../src/services/mapbox.service', () => ({
  MapboxService: {
    geocodeAddress: vi.fn(),
  },
}))

import { JobService } from '../../src/services/job.service'
import { db } from '../../src/config/db'
import { MapboxService } from '../../src/services/mapbox.service'

describe('JobService.createJob customer ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects a foreign/nonexistent customerId before geocoding or insert', async () => {
    ;(db.select().limit as any).mockResolvedValue([])

    await expect(
      JobService.createJob('tradie-1', {
        title: 'Leak repair',
        address: '1 Test St',
        customerId: 'customer-foreign',
      }),
    ).rejects.toThrow(/Customer not found/)

    expect(MapboxService.geocodeAddress).not.toHaveBeenCalled()
    expect(db.insert).not.toHaveBeenCalled()
    expect(db.update).not.toHaveBeenCalled()
  })
})
