import { describe, it, expect } from 'vitest'
import { calculateFromSubtotal } from '../../../packages/domain/src/gst'
import { formatAUD } from '../../../packages/domain/src/money'

describe('domain package', () => {
  it('calculates GST from subtotal', () => {
    const result = calculateFromSubtotal(10000)
    expect(result.gst).toBe(1000)
    expect(result.total).toBe(11000)
  })

  it('formats AUD currency', () => {
    expect(formatAUD(1050)).toContain('10.50')
  })
})
