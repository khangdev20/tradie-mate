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
import { stripeWebhookHandler } from './routes/webhooks/stripe'

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
  await fastify.register(tradieRoutes, { prefix: '/tradies' })
  await fastify.register(jobRoutes, { prefix: '/jobs' })
  await fastify.register(invoiceRoutes, { prefix: '/invoices' })

  // Webhooks (Raw body needed for Stripe signature)
  fastify.post('/webhooks/stripe', { 
    config: { rawBody: true } 
  }, stripeWebhookHandler)

  return fastify
}
