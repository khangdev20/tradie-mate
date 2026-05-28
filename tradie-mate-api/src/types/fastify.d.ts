import { User } from '@supabase/supabase-js'
import { tradies } from '../db/schema/tradies'

declare module 'fastify' {
  interface FastifyRequest {
    user: User
    tradie: typeof tradies.$inferSelect
  }
}
