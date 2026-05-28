// src/offline/database.ts
import { Database } from '@nozbe/watermelondb'
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import { appSchema, tableSchema } from '@nozbe/watermelondb'

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
  onSetUpError: error => console.error('WatermelonDB setup failed:', error),
})

export const database = new Database({
  adapter,
  modelClasses: [], // Models would go here
})
