import fp from 'fastify-plugin'
import { FastifyInstance, FastifyPluginAsync } from 'fastify'

const responseWrapperPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.addHook('onSend', async (request, reply, payload) => {
    // Skip wrapping Swagger system endpoints
    if (request.url.startsWith('/docs')) {
      return payload
    }

    // Only wrap success responses (HTTP 2xx)
    if (reply.statusCode < 200 || reply.statusCode >= 300) {
      return payload
    }

    // Only wrap JSON responses
    const contentType = reply.getHeader('content-type')
    if (!contentType || typeof contentType !== 'string' || !contentType.includes('application/json')) {
      return payload
    }

    // Skip wrapping if payload is empty or not string
    if (!payload || typeof payload !== 'string') {
      return payload
    }

    let parsedPayload: any
    try {
      parsedPayload = JSON.parse(payload)
    } catch (e) {
      // If it's not valid JSON, don't wrap it
      return payload
    }

    // If it already conforms to the wrapper (success + data/error), skip wrapping
    if (
      parsedPayload &&
      typeof parsedPayload === 'object' &&
      (('success' in parsedPayload && 'data' in parsedPayload) ||
       ('success' in parsedPayload && 'error' in parsedPayload))
    ) {
      return payload
    }

    // Wrap in standardized success envelope
    const wrapped = {
      success: true,
      data: parsedPayload
    }

    return JSON.stringify(wrapped)
  })
}

export default fp(responseWrapperPlugin)
