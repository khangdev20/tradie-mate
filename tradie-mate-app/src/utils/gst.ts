// src/utils/gst.ts — CRITICAL: integer cents only
export const GST_RATE = 10 // AU law — immutable

export function calculateGST(subtotalCents: number) {
  if (!Number.isInteger(subtotalCents)) {
    throw new Error('subtotalCents must be integer — no floats')
  }
  const gst = Math.round(subtotalCents * GST_RATE / 100)
  return { subtotal: subtotalCents, gst, total: subtotalCents + gst }
}

export function formatAUD(cents: number): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 2,
  }).format(cents / 100)
}
