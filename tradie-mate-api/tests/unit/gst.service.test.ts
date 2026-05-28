import { describe, it, expect } from 'vitest'
import { GSTService } from '../../src/services/gst.service'

describe('GSTService', () => {
  it('should calculate GST from subtotal correctly ($144 -> $14.40 GST)', () => {
    const subtotal = 14400 // $144.00
    const result = GSTService.calculateFromSubtotal(subtotal)
    expect(result.gst).toBe(1440)
    expect(result.total).toBe(15840)
  })

  it('should calculate GST from total correctly ($158.40 -> $14.40 GST)', () => {
    const total = 15840 // $158.40
    const result = GSTService.calculateFromTotal(total)
    expect(result.gst).toBe(1440)
    expect(result.subtotal).toBe(14400)
  })

  it('should handle small amounts with rounding ($0.01)', () => {
    const subtotal = 1 // 1 cent
    const result = GSTService.calculateFromSubtotal(subtotal)
    // 1 * 0.1 = 0.1 -> round(0.1) = 0
    expect(result.gst).toBe(0)
    expect(result.total).toBe(1)
  })

  it('should format cents to AUD string', () => {
    expect(GSTService.toAUD(15840)).toBe('$158.40')
  })
})
