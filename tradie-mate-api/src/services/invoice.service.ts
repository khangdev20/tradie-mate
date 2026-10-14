import { AppError } from '../utils/errors'
import { GSTService } from './gst.service'

export interface InvoiceItemInput {
  description: string
  quantity: number
  unitPriceCents: number
  unit?: string
}

export function formatInvoiceNumber(sequence: number, prefix = 'INV'): string {
  return `${prefix}-${String(sequence).padStart(4, '0')}`
}

/** Line totals, subtotal and 10% GST — integer cents throughout. */
export function calculateInvoiceTotals(items: InvoiceItemInput[]) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Job ID and invoice items are required.', 400)
  }

  let subtotalCents = 0
  const lines = items.map((item, idx) => {
    if (!item.description?.trim()) {
      throw new AppError(`Item ${idx + 1} needs a description.`, 400, 'VALIDATION_ERROR')
    }
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      throw new AppError(`Item ${idx + 1} quantity must be greater than zero.`, 400, 'VALIDATION_ERROR')
    }
    if (!Number.isInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new AppError(`Item ${idx + 1} price must be a whole number of cents.`, 400, 'VALIDATION_ERROR')
    }

    const lineTotalCents = Math.round(item.quantity * item.unitPriceCents)
    subtotalCents += lineTotalCents
    return {
      description: item.description,
      qty: item.quantity.toString(),
      unitPriceCents: item.unitPriceCents,
      lineTotalCents,
      unit: item.unit ?? 'item',
      sortOrder: idx,
    }
  })

  const gst = GSTService.calculateFromSubtotal(subtotalCents)
  return { lines, subtotalCents, gstCents: gst.gst, totalCents: gst.total }
}
