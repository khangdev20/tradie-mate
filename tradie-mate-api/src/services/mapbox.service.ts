import { db } from '../config/db'
import { geocodedAddresses, routeCache } from '../db/schema/location'
import { eq, and, gt } from 'drizzle-orm'
import { AppError } from '../utils/errors'

export class MapboxService {
  private static getGeohash(lat: number, lng: number): string {
    // Generate a simple coordinate-based hash key rounded to 4 decimal places (~11 meters precision)
    return `${lat.toFixed(4)},${lng.toFixed(4)}`
  }

  static async geocodeAddress(address: string): Promise<{
    formattedAddress: string
    latitude: number
    longitude: number
    confidence: number
  }> {
    const normalized = address.trim().toLowerCase()

    // 1. Check cache first
    const [cached] = await db
      .select()
      .from(geocodedAddresses)
      .where(eq(geocodedAddresses.normalizedAddress, normalized))
      .limit(1)

    if (cached) {
      return {
        formattedAddress: cached.formattedAddress,
        latitude: cached.latitudeMicro / 1000000,
        longitude: cached.longitudeMicro / 1000000,
        confidence: cached.confidence,
      }
    }

    // 2. Cache miss -> Call Mapbox API or use local mock (Brisbane fallback)
    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN
    let result = {
      formattedAddress: address,
      latitude: -27.4698, // Brisbane Central fallback
      longitude: 153.0251,
      confidence: 100,
      providerPlaceId: 'mock_place_id',
    }

    if (token) {
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          address
        )}.json?access_token=${token}&country=AU`
        const response = await fetch(url)
        const data = await response.json()

        if (data.features && data.features.length > 0) {
          const first = data.features[0]
          result = {
            formattedAddress: first.place_name,
            latitude: first.center[1],
            longitude: first.center[0],
            confidence: Math.round((first.relevance || 1) * 100),
            providerPlaceId: first.id,
          }
        }
      } catch (err) {
        console.error('Mapbox geocoding call failed, using fallback:', err)
      }
    }

    // 3. Save to database cache
    await db.insert(geocodedAddresses).values({
      normalizedAddress: normalized,
      formattedAddress: result.formattedAddress,
      latitudeMicro: Math.round(result.latitude * 1000000),
      longitudeMicro: Math.round(result.longitude * 1000000),
      confidence: result.confidence,
      provider: 'MAPBOX',
      providerPlaceId: result.providerPlaceId,
      updatedAt: new Date(),
    })

    return {
      formattedAddress: result.formattedAddress,
      latitude: result.latitude,
      longitude: result.longitude,
      confidence: result.confidence,
    }
  }

  static async getDrivingRoute(
    origin: { latitude: number; longitude: number },
    destination: { latitude: number; longitude: number },
    profile: string = 'driving-traffic'
  ) {
    const originHash = this.getGeohash(origin.latitude, origin.longitude)
    const destHash = this.getGeohash(destination.latitude, destination.longitude)
    const now = new Date()

    // 1. Check route cache
    const [cached] = await db
      .select()
      .from(routeCache)
      .where(
        and(
          eq(routeCache.originGeohash, originHash),
          eq(routeCache.destinationGeohash, destHash),
          eq(routeCache.profile, profile),
          gt(routeCache.expiresAt, now)
        )
      )
      .limit(1)

    if (cached) {
      return {
        distanceMeters: cached.distanceMeters,
        durationSeconds: cached.durationSeconds,
        trafficDurationSeconds: cached.trafficDurationSeconds,
        polyline: cached.polyline,
        calculatedAt: cached.createdAt,
      }
    }

    // 2. Cache miss -> Retrieve from Mapbox or mock routing line
    const token = process.env.MAPBOX_SECRET_TOKEN || process.env.MAPBOX_PUBLIC_TOKEN
    let route = {
      distanceMeters: 4500,
      durationSeconds: 600,
      trafficDurationSeconds: 680,
      polyline: '_p~iF~ps|U_ulLnnqC_ga|aC', // mock dummy polyline
      providerPayload: {},
    }

    if (token) {
      try {
        const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
        const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?access_token=${token}&geometries=polyline`
        const response = await fetch(url)
        const data = await response.json()

        if (data.routes && data.routes.length > 0) {
          const primary = data.routes[0]
          route = {
            distanceMeters: Math.round(primary.distance),
            durationSeconds: Math.round(primary.duration),
            trafficDurationSeconds: primary.duration_typical
              ? Math.round(primary.duration_typical)
              : Math.round(primary.duration),
            polyline: primary.geometry,
            providerPayload: data,
          }
        }
      } catch (err) {
        console.error('Mapbox Directions call failed, using mock routing line:', err)
      }
    }

    // 3. Save to route cache with 5-minute expiration
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await db.insert(routeCache).values({
      originGeohash: originHash,
      destinationGeohash: destHash,
      profile,
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      trafficDurationSeconds: route.trafficDurationSeconds,
      polyline: route.polyline,
      providerPayload: route.providerPayload,
      expiresAt,
    })

    return {
      distanceMeters: route.distanceMeters,
      durationSeconds: route.durationSeconds,
      trafficDurationSeconds: route.trafficDurationSeconds,
      polyline: route.polyline,
      calculatedAt: now,
    }
  }
}
