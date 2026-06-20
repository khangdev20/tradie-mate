import { FastifyInstance } from 'fastify'
import { requireAuthUser } from '../../middleware/requireAuthUser'
import { requireAuth } from '../../middleware/requireAuth'
import {
  completeProfileHandler,
  getOnboardingStatusHandler,
  validateAbnHandler,
  uploadDocumentHandler,
} from './handler'
import {
  completeProfileSchema,
  getOnboardingStatusSchema,
  validateAbnSchema,
  uploadDocumentSchema,
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

export async function documentRoutes(fastify: FastifyInstance) {
  // Requires valid JWT + tradie row (handled inside handler for better error messages)
  fastify.post('/upload', {
    schema: uploadDocumentSchema,
    preHandler: [requireAuthUser],
  }, uploadDocumentHandler)
}
