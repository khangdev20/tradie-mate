import 'dotenv/config'
import { Redis } from 'ioredis'

const redis = new Redis(process.env.REDIS_URL!, {
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
})

async function main() {
  const pong = await redis.ping()
  console.log('PING:', pong)
  redis.disconnect()
}

main().catch((err) => {
  console.error('Redis error:', (err as Error).message)
  process.exit(1)
})
