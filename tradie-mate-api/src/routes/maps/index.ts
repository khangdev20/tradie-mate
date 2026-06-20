import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth, requireOnboarded } from '../../middleware/auth.middleware'
import { MapboxService } from '../../services/mapbox.service'
import { db } from '../../config/db'
import { locationEvents } from '../../db/schema/location'
import { AppError } from '../../utils/errors'

export async function mapRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)
  fastify.addHook('preHandler', requireOnboarded)

  // 1. Geocode Address with local cache check
  fastify.post('/geocode', async (request: FastifyRequest<{
    Body: { address: string }
  }>) => {
    const { address } = request.body
    if (!address) {
      throw new AppError('Address query parameter is required', 400)
    }

    const geocode = await MapboxService.geocodeAddress(address)

    return {
      success: true,
      data: geocode,
    }
  })

  // 2. Fetch Driving Route with short TTL cache
  fastify.post('/route', async (request: FastifyRequest<{
    Body: {
      origin: { latitude: number; longitude: number }
      destination: { latitude: number; longitude: number }
      profile?: 'driving-traffic' | 'driving' | 'walking' | 'cycling'
    }
  }>) => {
    const { origin, destination, profile = 'driving-traffic' } = request.body

    if (!origin || !destination) {
      throw new AppError('Origin and destination coordinates are required.', 400)
    }

    // Verify coordinates are within approximate boundary of Australia
    const isAU = (lat: number, lng: number) => {
      return lat <= -9 && lat >= -45 && lng >= 110 && lng <= 155
    }

    if (!isAU(origin.latitude, origin.longitude) || !isAU(destination.latitude, destination.longitude)) {
      throw new AppError('Coordinates must be within Australia boundary.', 400)
    }

    const route = await MapboxService.getDrivingRoute(origin, destination, profile)

    return {
      success: true,
      data: route,
    }
  })

  // 3. Log Location Permission or Stale Location Events
  fastify.post('/location-event', async (request: FastifyRequest<{
    Body: {
      jobId?: string
      eventType: string
      metadata?: any
    }
  }>) => {
    const { jobId, eventType, metadata } = request.body
    const tradieId = request.tradie.id

    if (!eventType) {
      throw new AppError('Event type is required', 400)
    }

    const [event] = await db
      .insert(locationEvents)
      .values({
        tradieId,
        jobId: jobId ?? null,
        eventType,
        metadata: metadata ?? null,
        createdAt: new Date(),
      })
      .returning()

    return {
      success: true,
      data: { recorded: true, id: event.id },
    }
  })
}
