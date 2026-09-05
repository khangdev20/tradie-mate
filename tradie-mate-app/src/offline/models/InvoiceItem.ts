import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class InvoiceItem extends Model {
  static table = 'invoice_items'

  @text('invoice_id') invoiceId!: string
  @text('description') description!: string
  @field('qty') qty!: number
  @field('unit_price_cents') unitPriceCents!: number
  @field('line_total_cents') lineTotalCents!: number
  @text('unit') unit!: string
  @field('sort_order') sortOrder!: number
}
