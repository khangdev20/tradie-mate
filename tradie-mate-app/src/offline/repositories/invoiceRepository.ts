import { database } from '../database'
import { Invoice } from '../models/Invoice'
import { InvoiceItem } from '../models/InvoiceItem'
import { calculateGST } from '../../utils/gst'

export interface OfflineLineItem {
  description: string
  qty: number
  unitPriceCents: number
  unit?: string
}

export interface InvoiceTotals {
  subtotalCents: number
  gstCents: number
  totalCents: number
}

export function calculateInvoiceTotals(items: OfflineLineItem[]): InvoiceTotals {
  const subtotalCents = items.reduce((sum, item) => {
    if (!Number.isInteger(item.qty) || !Number.isInteger(item.unitPriceCents)) {
      throw new Error('qty and unitPriceCents must be integers (cents)')
    }
    return sum + item.unitPriceCents * item.qty
  }, 0)

  const { gst, total } = calculateGST(subtotalCents)
  return { subtotalCents, gstCents: gst, totalCents: total }
}

export async function saveOfflineInvoice(params: {
  jobId?: string | null
  customerId?: string | null
  invoiceNumber?: string | null
  items: OfflineLineItem[]
}): Promise<{ localId: string } & InvoiceTotals> {
  const totals = calculateInvoiceTotals(params.items)

  const localId = await database.write(async () => {
    const invoice = await database.get<Invoice>('invoices').create((rec) => {
      rec.serverId = null
      rec.jobId = params.jobId ?? null
      rec.customerId = params.customerId ?? null
      rec.invoiceNumber = params.invoiceNumber ?? null
      rec.status = 'DRAFT'
      rec.subtotalCents = totals.subtotalCents
      rec.gstCents = totals.gstCents
      rec.totalCents = totals.totalCents
      rec.paidCents = 0
      rec.issuedAt = Date.now()
      rec.signatureData = null
      rec.signatureUrl = null
      rec.notes = null
      rec.synced = false
    })

    for (const [index, item] of params.items.entries()) {
      await database.get<InvoiceItem>('invoice_items').create((rec) => {
        rec.invoiceId = invoice.id
        rec.description = item.description
        rec.qty = item.qty
        rec.unitPriceCents = item.unitPriceCents
        rec.lineTotalCents = item.unitPriceCents * item.qty
        rec.unit = item.unit ?? 'item'
        rec.sortOrder = index
      })
    }

    return invoice.id
  })

  return { localId, ...totals }
}
