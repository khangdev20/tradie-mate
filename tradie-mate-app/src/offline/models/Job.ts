import { Model } from '@nozbe/watermelondb'
import { field, text } from '@nozbe/watermelondb/decorators'

export class Job extends Model {
  static table = 'jobs'

  @text('server_id') serverId!: string
  @text('title') title!: string
  @text('status') status!: string
  @field('synced') synced!: boolean
}
