import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import rawBody from 'fastify-raw-body'
import { env } from './config/env'
import { setupErrorHandler } from './utils/errors'
import responseWrapperPlugin from './plugins/response'
import { authRoutes } from './routes/auth'
import { tradieRoutes } from './routes/tradies'
import { jobRoutes } from './routes/jobs'
import { invoiceRoutes } from './routes/invoices'
import { paymentRoutes } from './routes/payments'
import { billingRoutes } from './routes/billing'
import { mapRoutes } from './routes/maps'
import { syncRoutes } from './routes/sync'
import { stripeWebhookHandler } from './routes/webhooks/stripe'
import { onboardingRoutes, documentRoutes } from './routes/onboarding'

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
    },
    disableRequestLogging: true,
    requestIdHeader: 'x-request-id',
  })

  // Plugins
  await fastify.register(cors, {
    origin: '*', // Adjust for production React Native + web
  })

  fastify.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
    return payload
  })

  await fastify.register(jwt, {
    secret: env.JWT_SECRET,
  })

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  })

  await fastify.register(multipart)
  
  await fastify.register(responseWrapperPlugin)
  
  await fastify.register(rawBody, {
    field: 'rawBody',
    global: false,
    encoding: 'utf8',
    runFirst: true,
  })

  await fastify.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'TradieMate API',
        description: 'Job management SaaS for AU tradies',
        version: '1.0.0',
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  })

  // Error handler
  setupErrorHandler(fastify)

  // Health check
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
    }
  })

  // Routes registration
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(onboardingRoutes, { prefix: '/onboarding' })
  await fastify.register(documentRoutes, { prefix: '/documents' })
  await fastify.register(tradieRoutes, { prefix: '/tradies' })
  await fastify.register(jobRoutes, { prefix: '/jobs' })
  await fastify.register(invoiceRoutes, { prefix: '/invoices' })
  await fastify.register(paymentRoutes, { prefix: '/payments' })
  await fastify.register(billingRoutes, { prefix: '/billing' })
  await fastify.register(mapRoutes, { prefix: '/maps' })
  await fastify.register(syncRoutes, { prefix: '/sync' })

  // Webhooks (Raw body needed for Stripe signature)
  fastify.post('/webhooks/stripe', { 
    config: { rawBody: true } 
  }, stripeWebhookHandler)

  return fastify
}

