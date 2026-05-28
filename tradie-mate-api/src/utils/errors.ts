import { FastifyInstance, FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import * as Sentry from '@sentry/node'

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 400,
    public code: string = 'BAD_REQUEST'
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const isProduction = process.env.NODE_ENV === 'production'
    
    // Log to Sentry if 5xx
    if (error.statusCode && error.statusCode >= 500) {
      Sentry.captureException(error)
      fastify.log.error(error)
    }

    // Format response
    const statusCode = error.statusCode || 500
    const response = {
      success: false,
      error: {
        statusCode,
        code: (error as any).code || 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Internal Server Error',
        ...(isProduction ? {} : { stack: error.stack }),
      }
    }

    reply.status(statusCode).send(response)
  })

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      success: false,
      error: {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `Route ${request.method}:${request.url} not found`
      }
    })
  })
}
