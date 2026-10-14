import { describe, it, expect } from 'vitest'
import { calculateInvoiceTotals, formatInvoiceNumber } from '../../src/services/invoice.service'

describe('formatInvoiceNumber', () => {
  it('zero-pads to four digits', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-0001')
    expect(formatInvoiceNumber(42)).toBe('INV-0042')
  })

  it('keeps counting past 9999 instead of truncating', () => {
    expect(formatInvoiceNumber(12345)).toBe('INV-12345')
  })
})

describe('calculateInvoiceTotals', () => {
  it('sums line totals and adds 10% GST in integer cents', () => {
    const totals = calculateInvoiceTotals([
      { description: 'Labour', quantity: 2, unitPriceCents: 9500, unit: 'hour' },
      { description: 'Tap washer', quantity: 3, unitPriceCents: 250 },
    ])

    expect(totals.subtotalCents).toBe(19750)
    expect(totals.gstCents).toBe(1975)
    expect(totals.totalCents).toBe(21725)
    expect(totals.lines.map((line) => line.lineTotalCents)).toEqual([19000, 750])
    expect(totals.lines[1].unit).toBe('item')
  })

  it('rounds fractional quantities to whole cents', () => {
    const totals = calculateInvoiceTotals([
      { description: 'Labour', quantity: 1.5, unitPriceCents: 3333 },
    ])

    expect(totals.lines[0].lineTotalCents).toBe(5000) // 4999.5 → 5000
    expect(Number.isInteger(totals.gstCents)).toBe(true)
    expect(totals.totalCents).toBe(totals.subtotalCents + totals.gstCents)
  })

  it.each([
    ['zero quantity', { description: 'x', quantity: 0, unitPriceCents: 100 }],
    ['negative quantity', { description: 'x', quantity: -1, unitPriceCents: 100 }],
    ['negative price', { description: 'x', quantity: 1, unitPriceCents: -100 }],
    ['fractional cents', { description: 'x', quantity: 1, unitPriceCents: 10.5 }],
    ['missing description', { description: '  ', quantity: 1, unitPriceCents: 100 }],
  ])('rejects %s', (_label, item) => {
    expect(() => calculateInvoiceTotals([item])).toThrow()
  })

  it('rejects an empty item list', () => {
    expect(() => calculateInvoiceTotals([])).toThrow(/items are required/)
  })
})
