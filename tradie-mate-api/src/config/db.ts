import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../db/schema'
import * as relations from '../db/relations'
import { env } from './env'

// Use pooled URL for queries (goes through PgBouncer)
const queryClient = postgres(env.DATABASE_URL)

// Use direct URL for migrations only (bypasses PgBouncer)
export const migrationClient = postgres(env.DIRECT_DATABASE_URL, { max: 1 })

export const db = drizzle(queryClient, {
  schema: { ...schema, ...relations },
  logger: env.NODE_ENV === 'development',
})

export type DB = typeof db
