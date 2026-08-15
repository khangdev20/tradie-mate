import PDFDocument from 'pdfkit'
import { uploadToS3 } from './s3.service'
import { GSTService } from './gst.service'

type InvoicePdfInput = {
  invoiceId: string
  tradieId: string
  invoiceNumber: string
  tradieName: string
  abn?: string | null
  items: { description: string; quantity: string; unitPriceCents: number; lineTotalCents: number }[]
  subtotalCents: number
  gstCents: number
  totalCents: number
  dueAt?: Date | null
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<{ pdfUrl: string; storagePath: string }> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' })
  const chunks: Buffer[] = []

  doc.on('data', (chunk) => chunks.push(chunk))

  const pdfPromise = new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  doc.fontSize(20).text('TAX INVOICE', { align: 'right' })
  doc.moveDown()
  doc.fontSize(12).text(input.tradieName)
  if (input.abn) doc.text(`ABN: ${input.abn}`)
  doc.moveDown()
  doc.text(`Invoice #: ${input.invoiceNumber}`)
  doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`)
  if (input.dueAt) doc.text(`Due: ${new Date(input.dueAt).toLocaleDateString('en-AU')}`)
  doc.moveDown()

  doc.font('Helvetica-Bold')
  doc.text('Description', 50, doc.y, { continued: true, width: 250 })
  doc.text('Qty', 300, doc.y - doc.currentLineHeight(), { continued: true, width: 50 })
  doc.text('Amount', 400, doc.y - doc.currentLineHeight())
  doc.font('Helvetica')

  for (const item of input.items) {
    doc.text(item.description, 50, doc.y, { continued: true, width: 250 })
    doc.text(String(item.quantity), 300, doc.y - doc.currentLineHeight(), { continued: true, width: 50 })
    doc.text(GSTService.toAUD(item.lineTotalCents), 400, doc.y - doc.currentLineHeight())
  }

  doc.moveDown()
  doc.text(`Subtotal: ${GSTService.toAUD(input.subtotalCents)}`, { align: 'right' })
  doc.text(`GST (10%): ${GSTService.toAUD(input.gstCents)}`, { align: 'right' })
  doc.font('Helvetica-Bold').text(`Total: ${GSTService.toAUD(input.totalCents)}`, { align: 'right' })

  doc.end()
  const pdfBuffer = await pdfPromise

  const storagePath = `invoices/${input.tradieId}/${input.invoiceId}.pdf`
  const pdfUrl = await uploadToS3(storagePath, pdfBuffer, 'application/pdf')

  return { pdfUrl, storagePath }
}
