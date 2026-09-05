import type { Cents } from './money'

const GST_RATE = 10

export function calculateFromSubtotal(subtotalCents: Cents) {
  const gst = Math.round((subtotalCents * GST_RATE) / 100)
  return { subtotal: subtotalCents, gst, total: subtotalCents + gst }
}

export function calculateFromTotal(totalCents: Cents) {
  const gst = Math.round((totalCents * GST_RATE) / (100 + GST_RATE))
  return { subtotal: totalCents - gst, gst, total: totalCents }
}
