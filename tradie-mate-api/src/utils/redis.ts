import Redis from 'ioredis'
import { env } from '../config/env'

export const redis = new Redis(env.REDIS_URL)

redis.on('error', (err) => {
  console.error('Redis Error:', err)
})

redis.on('connect', () => {
  console.log('✅ Redis connected')
})
