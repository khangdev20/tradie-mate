import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class Job extends Model {
  static table = 'jobs'

  @text('server_id') serverId!: string | null
  @text('title') title!: string
  @text('status') status!: string
  @text('description') description!: string | null
  @text('address') address!: string | null
  @text('customer_name') customerName!: string | null
  @field('scheduled_at') scheduledAt!: number | null
  @text('photos') photos!: string | null
  @text('notes') notes!: string | null
  @field('synced') synced!: boolean
}
