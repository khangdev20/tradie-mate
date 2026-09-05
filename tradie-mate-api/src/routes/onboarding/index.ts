import { FastifyInstance } from 'fastify'
import { requireAuthUser } from '../../middleware/requireAuthUser'
import {
  completeProfileHandler,
  getOnboardingStatusHandler,
  validateAbnHandler,
} from './handler'
import {
  completeProfileSchema,
  getOnboardingStatusSchema,
  validateAbnSchema,
} from './schema'

export async function onboardingRoutes(fastify: FastifyInstance) {
  // Public ABN validation helper (also allows authenticated)
  fastify.post('/abn/validate', { schema: validateAbnSchema }, validateAbnHandler)

  // Requires valid JWT (tradie row optional)
  fastify.post('/profile', {
    schema: completeProfileSchema,
    preHandler: [requireAuthUser],
  }, completeProfileHandler)

  fastify.get('/status', {
    schema: getOnboardingStatusSchema,
    preHandler: [requireAuthUser],
  }, getOnboardingStatusHandler)
}
