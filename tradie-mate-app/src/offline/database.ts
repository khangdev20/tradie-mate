// src/offline/database.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { appSchema, tableSchema } from '@nozbe/watermelondb'
import { Job, Invoice } from './models'
import type { Job as JobModel } from './models/Job'

const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'jobs',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'title', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'job_id', type: 'string' },
        { name: 'total_cents', type: 'number' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
  ],
})

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => console.error('WatermelonDB setup failed:', error),
})

export const database = new Database({
  adapter,
  modelClasses: [Job, Invoice],
})

export async function upsertLocalJob(params: {
  serverId: string
  title: string
  status: string
  synced?: boolean
}) {
  await database.write(async () => {
    const existing = await database.get<JobModel>('jobs').query().fetch()
    const match = existing.find((j) => j.serverId === params.serverId)
    if (match) {
      await match.update((rec) => {
        rec.title = params.title
        rec.status = params.status
        rec.synced = params.synced ?? true
      })
    } else {
      await database.get<JobModel>('jobs').create((rec) => {
        rec.serverId = params.serverId
        rec.title = params.title
        rec.status = params.status
        rec.synced = params.synced ?? true
      })
    }
  })
}
