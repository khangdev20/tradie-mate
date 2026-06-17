import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { MapboxService } from '../../services/mapbox.service'
import { LocationService } from '../../services/location.service'
import { db } from '../../config/db'
import { locationEvents } from '../../db/schema/location'
import { AppError } from '../../utils/errors'

export async function mapRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', requireAuth)

  fastify.post('/geocode', async (request: FastifyRequest<{
    Body: { address: string }
  }>) => {
    const { address } = request.body
    if (!address) {
      throw new AppError('Address query parameter is required', 400, 'VALIDATION_ERROR')
    }

    const geocode = await MapboxService.geocodeAddress(address)

    return {
      success: true,
      data: geocode,
    }
  })

  fastify.post('/route', async (request: FastifyRequest<{
    Body: {
      origin: { latitude: number; longitude: number }
      destination: { latitude: number; longitude: number }
      profile?: 'driving-traffic' | 'driving' | 'walking' | 'cycling'
    }
  }>) => {
    const { origin, destination, profile = 'driving-traffic' } = request.body

    if (!origin || !destination) {
      throw new AppError('Origin and destination coordinates are required.', 400, 'VALIDATION_ERROR')
    }

    const isAU = (lat: number, lng: number) => lat <= -9 && lat >= -45 && lng >= 110 && lng <= 155

    if (!isAU(origin.latitude, origin.longitude) || !isAU(destination.latitude, destination.longitude)) {
      throw new AppError('Coordinates must be within Australia boundary.', 400, 'VALIDATION_ERROR')
    }

    const route = await MapboxService.getDrivingRoute(origin, destination, profile)

    return {
      success: true,
      data: route,
    }
  })

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
      throw new AppError('Event type is required', 400, 'VALIDATION_ERROR')
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

  /** Batched GPS updates during commute — writes to Firestore + audit log. */
  fastify.post('/location-batch', async (request: FastifyRequest<{
    Body: {
      jobId: string
      points: Array<{
        lat: number
        lng: number
        accuracy?: number
        heading?: number
        speedMetersPerSecond?: number
        recorded_at: string
      }>
      etaSeconds?: number | null
      distanceRemainingMeters?: number | null
      routePolyline?: string | null
    }
  }>) => {
    const { jobId, points, etaSeconds, distanceRemainingMeters, routePolyline } = request.body
    const tradieId = request.tradie.id

    if (!jobId || !points?.length) {
      throw new AppError('jobId and at least one GPS point are required.', 400, 'VALIDATION_ERROR')
    }

    if (points.length > 20) {
      throw new AppError('Maximum 20 GPS points per batch.', 400, 'VALIDATION_ERROR')
    }

    await LocationService.writeTrackingBatch({
      tradieId,
      jobId,
      points,
      etaSeconds,
      distanceRemainingMeters,
      routePolyline,
    })

    return {
      success: true,
      data: { recorded: points.length },
    }
  })
}
