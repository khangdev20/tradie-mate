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
import { deviceRoutes } from './routes/devices'
import { documentRoutes } from './routes/documents'
import { reviewRoutes } from './routes/reviews'
import { earningsRoutes } from './routes/earnings'
import { integrationRoutes } from './routes/integrations'
import { adminRoutes } from './routes/admin'
import { suppliesRoutes } from './routes/supplies'
import { enterpriseRoutes } from './routes/enterprise'
import { marketplaceRoutes } from './routes/marketplace'
import { notificationRoutes } from './routes/notifications'
import { publicRoutes } from './routes/public'
import { analyticsRoutes } from './routes/analytics'
import { voiceAgentRoutes } from './routes/voice-agent'
import { stripeWebhookHandler } from './routes/webhooks/stripe'
import { stripeBillingWebhookHandler } from './routes/webhooks/stripe-billing'
import { twilioCallWebhookHandler } from './routes/webhooks/twilio-call'

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

  // Phase 1 Routes
  await fastify.register(authRoutes, { prefix: '/auth' })
  await fastify.register(tradieRoutes, { prefix: '/tradies' })
  await fastify.register(jobRoutes, { prefix: '/jobs' })
  await fastify.register(invoiceRoutes, { prefix: '/invoices' })
  await fastify.register(paymentRoutes, { prefix: '/payments' })
  await fastify.register(billingRoutes, { prefix: '/billing' })
  await fastify.register(mapRoutes, { prefix: '/maps' })
  await fastify.register(syncRoutes, { prefix: '/sync' })
  await fastify.register(deviceRoutes, { prefix: '/devices' })

  // Phase 2 Routes
  await fastify.register(documentRoutes, { prefix: '/documents' })
  await fastify.register(reviewRoutes, { prefix: '/reviews' })

  // Phase 3 Routes
  await fastify.register(earningsRoutes, { prefix: '/earnings' })
  await fastify.register(integrationRoutes, { prefix: '/integrations' })
  await fastify.register(adminRoutes, { prefix: '/admin' })
  await fastify.register(suppliesRoutes, { prefix: '/supplies' })

  // Phase 4 Routes
  await fastify.register(enterpriseRoutes, { prefix: '/enterprise' })
  await fastify.register(marketplaceRoutes, { prefix: '/marketplace' })

  // Notifications (cross-phase)
  await fastify.register(notificationRoutes, { prefix: '/notifications' })

  // Public web surfaces (no auth)
  await fastify.register(publicRoutes, { prefix: '/public' })
  await fastify.register(analyticsRoutes, { prefix: '/analytics' })
  await fastify.register(voiceAgentRoutes, { prefix: '/voice-agent' })

  // Versioned aliases for the implementation-plan API contract.
  await fastify.register(authRoutes, { prefix: '/api/v1/auth' })
  await fastify.register(tradieRoutes, { prefix: '/api/v1/tradies' })
  await fastify.register(jobRoutes, { prefix: '/api/v1/jobs' })
  await fastify.register(invoiceRoutes, { prefix: '/api/v1/invoices' })
  await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' })
  await fastify.register(billingRoutes, { prefix: '/api/v1/billing' })
  await fastify.register(mapRoutes, { prefix: '/api/v1/maps' })
  await fastify.register(syncRoutes, { prefix: '/api/v1/sync' })
  await fastify.register(deviceRoutes, { prefix: '/api/v1/devices' })
  await fastify.register(documentRoutes, { prefix: '/api/v1/documents' })
  await fastify.register(reviewRoutes, { prefix: '/api/v1/reviews' })
  await fastify.register(earningsRoutes, { prefix: '/api/v1/earnings' })
  await fastify.register(integrationRoutes, { prefix: '/api/v1/integrations' })
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' })
  await fastify.register(suppliesRoutes, { prefix: '/api/v1/supplies' })
  await fastify.register(enterpriseRoutes, { prefix: '/api/v1/enterprise' })
  await fastify.register(marketplaceRoutes, { prefix: '/api/v1/marketplace' })
  await fastify.register(notificationRoutes, { prefix: '/api/v1/notifications' })
  await fastify.register(publicRoutes, { prefix: '/api/v1/public' })
  await fastify.register(analyticsRoutes, { prefix: '/api/v1/analytics' })
  await fastify.register(voiceAgentRoutes, { prefix: '/api/v1/voice-agent' })

  // Webhooks (Raw body needed for Stripe signature)
  fastify.post('/webhooks/stripe', { 
    config: { rawBody: true } 
  }, stripeWebhookHandler)

  fastify.post('/webhooks/stripe-billing', {
    config: { rawBody: true }
  }, stripeBillingWebhookHandler)

  fastify.post('/webhooks/twilio-call', twilioCallWebhookHandler)

  return fastify
}

