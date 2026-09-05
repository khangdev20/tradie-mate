import { env } from './config/env'
import { buildApp } from './app'

async function start() {
  // Force reload server to pick up database migration schema, auth middleware, db config, service, and route handler updates
  const fastify = await buildApp()

  try {
    await fastify.listen({ port: Number(env.PORT), host: '0.0.0.0' })
    fastify.log.info(`🚀 Server listening on http://0.0.0.0:${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }

  const shutdown = async (signal: string) => {
    fastify.log.info(`Received ${signal}, shutting down gracefully`)
    await fastify.close()
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

start()
