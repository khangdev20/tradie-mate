// src/routes/invoices/handler.ts
import { db } from '../../config/db'
import { invoices, invoiceItems } from '../../db/schema'
import { eq, max } from 'drizzle-orm'
import { GSTService } from '../../services/gst.service'

export async function createInvoice(
  tradieId: string,
  jobId: string,
  items: { description: string; qty: number; unitPriceCents: number; unit: string }[]
) {
  return await db.transaction(async (tx) => {
    // Get next sequence — SELECT FOR UPDATE prevents race conditions
    const [seqResult] = await tx
      .select({ max: max(invoices.sequenceNumber) })
      .from(invoices)
      .where(eq(invoices.tradieId, tradieId))
      .for('update')                    // Drizzle native lock

    const nextSeq = (seqResult?.max ?? 0) + 1
    const invoiceNumber = `INV-${String(nextSeq).padStart(4, '0')}`

    // Calculate totals — INTEGER CENTS ONLY
    const subtotalCents = items.reduce(
      (sum, item) => sum + Math.round(item.qty * item.unitPriceCents), 0
    )
    const { gst: gstCents, total: totalCents } =
      GSTService.calculateFromSubtotal(subtotalCents)

    // Insert invoice
    const [invoice] = await tx
      .insert(invoices)
      .values({
        tradieId,
        jobId,
        invoiceNumber,
        sequenceNumber: nextSeq,
        subtotalCents,
        gstCents,
        totalCents,
        status: 'DRAFT',
      })
      .returning()

    // Insert items — bulk
    await tx.insert(invoiceItems).values(
      items.map((item, i) => ({
        invoiceId:      invoice.id,
        description:    item.description,
        qty:            String(item.qty),
        unitPriceCents: item.unitPriceCents,
        lineTotalCents: Math.round(item.qty * item.unitPriceCents),
        unit:           item.unit,
        sortOrder:      i,
      }))
    )

    return invoice
  })
}
