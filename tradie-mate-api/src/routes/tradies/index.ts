import { FastifyInstance } from 'fastify'
import { registerTradieHandler } from './handler'
import { registerTradieSchema } from './schema'
import { requireAuth } from '../../middleware/requireAuth'

export async function tradieRoutes(fastify: FastifyInstance) {
  fastify.post('/register', { 
    schema: registerTradieSchema,
    preHandler: [requireAuth] 
  }, registerTradieHandler)
}
