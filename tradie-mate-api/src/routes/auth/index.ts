import { FastifyInstance } from 'fastify'
import { 
  sendOtpHandler, 
  verifyOtpHandler, 
  refreshHandler, 
  logoutHandler,
  emailRegisterHandler,
  emailLoginHandler,
  forgotPasswordHandler,
  oauthCallbackHandler,
  linkProviderHandler,
  unlinkProviderHandler,
  getAuthMethodsHandler
} from './handler'
import { 
  sendOtpSchema, 
  verifyOtpSchema, 
  refreshSchema, 
  logoutSchema,
  emailRegisterSchema,
  emailLoginSchema,
  forgotPasswordSchema,
  oauthCallbackSchema,
  linkProviderSchema,
  unlinkProviderSchema,
  getAuthMethodsSchema
} from './schema'
import { requireAuth } from '../../middleware/requireAuth'

export async function authRoutes(fastify: FastifyInstance) {
  // Public
  fastify.post('/otp/send', { schema: sendOtpSchema }, sendOtpHandler)
  fastify.post('/otp/verify', { schema: verifyOtpSchema }, verifyOtpHandler)
  fastify.post('/email/register', { schema: emailRegisterSchema }, emailRegisterHandler)
  fastify.post('/email/login', { schema: emailLoginSchema }, emailLoginHandler)
  fastify.post('/email/forgot-password', { schema: forgotPasswordSchema }, forgotPasswordHandler)
  fastify.post('/oauth/callback', { schema: oauthCallbackSchema }, oauthCallbackHandler)
  fastify.post('/refresh', { schema: refreshSchema }, refreshHandler)

  // Protected
  fastify.post('/logout', { 
    schema: logoutSchema,
    preHandler: [requireAuth] 
  }, logoutHandler)

  fastify.get('/methods', {
    schema: getAuthMethodsSchema,
    preHandler: [requireAuth]
  }, getAuthMethodsHandler)

  fastify.post('/link/:provider', {
    schema: linkProviderSchema,
    preHandler: [requireAuth]
  }, linkProviderHandler)

  fastify.delete('/unlink/:provider', {
    schema: unlinkProviderSchema,
    preHandler: [requireAuth]
  }, unlinkProviderHandler)
}
