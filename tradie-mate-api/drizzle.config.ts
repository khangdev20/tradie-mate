import type { Config } from 'drizzle-kit'
import { env } from './src/config/env'

export default {
  schema:    './src/db/schema/index.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: {
    url: env.DIRECT_DATABASE_URL,  // bypass PgBouncer for migrations
  },
  verbose: true,
  strict:  true,
} satisfies Config
