import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class Invoice extends Model {
  static table = 'invoices'

  @text('server_id') serverId!: string | null
  @text('job_id') jobId!: string | null
  @text('customer_id') customerId!: string | null
  @text('invoice_number') invoiceNumber!: string | null
  @text('status') status!: string
  @field('subtotal_cents') subtotalCents!: number
  @field('gst_cents') gstCents!: number
  @field('total_cents') totalCents!: number
  @field('paid_cents') paidCents!: number
  @field('issued_at') issuedAt!: number | null
  @text('signature_data') signatureData!: string | null
  @text('signature_url') signatureUrl!: string | null
  @text('notes') notes!: string | null
  @field('synced') synced!: boolean
}
