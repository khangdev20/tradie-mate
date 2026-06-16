import { describe, it, expect } from 'vitest'
import { GSTService } from '../../src/services/gst.service'

describe('GSTService invoice totals', () => {
  it('calculates 10% GST in integer cents', () => {
    const result = GSTService.calculateFromSubtotal(10000)
    expect(result.gst).toBe(1000)
    expect(result.total).toBe(11000)
  })

  it('handles zero subtotal', () => {
    const result = GSTService.calculateFromSubtotal(0)
    expect(result.gst).toBe(0)
    expect(result.total).toBe(0)
  })
})
