// src/offline/database.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { appSchema, tableSchema } from '@nozbe/watermelondb'
import { Job, Invoice, InvoiceItem } from './models'
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
        { name: 'description', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'customer_name', type: 'string' },
        { name: 'scheduled_at', type: 'number' },
        { name: 'photos', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'invoices',
      columns: [
        { name: 'server_id', type: 'string' },
        { name: 'job_id', type: 'string' },
        { name: 'customer_id', type: 'string' },
        { name: 'invoice_number', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'subtotal_cents', type: 'number' },
        { name: 'gst_cents', type: 'number' },
        { name: 'total_cents', type: 'number' },
        { name: 'paid_cents', type: 'number' },
        { name: 'issued_at', type: 'number' },
        { name: 'signature_data', type: 'string' },
        { name: 'signature_url', type: 'string' },
        { name: 'notes', type: 'string' },
        { name: 'synced', type: 'boolean' },
      ],
    }),
    tableSchema({
      name: 'invoice_items',
      columns: [
        { name: 'invoice_id', type: 'string' },
        { name: 'description', type: 'string' },
        { name: 'qty', type: 'number' },
        { name: 'unit_price_cents', type: 'number' },
        { name: 'line_total_cents', type: 'number' },
        { name: 'unit', type: 'string' },
        { name: 'sort_order', type: 'number' },
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
  modelClasses: [Job, Invoice, InvoiceItem],
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
