import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class Invoice extends Model {
  static table = 'invoices'

  @text('server_id') serverId!: string
  @text('job_id') jobId!: string
  @field('total_cents') totalCents!: number
  @field('synced') synced!: boolean
}
