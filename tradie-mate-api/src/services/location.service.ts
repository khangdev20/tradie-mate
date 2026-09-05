import { firestore } from '../config/firebase'
import { db } from '../config/db'
import { locationEvents } from '../db/schema/location'
import { AppError } from '../utils/errors'

export interface GpsPoint {
  lat: number
  lng: number
  accuracy?: number
  heading?: number
  speedMetersPerSecond?: number
  recorded_at: string
}

export class LocationService {
  static async writeTrackingBatch(params: {
    tradieId: string
    jobId: string
    points: GpsPoint[]
    etaSeconds?: number | null
    distanceRemainingMeters?: number | null
    routePolyline?: string | null
  }) {
    const latest = params.points[params.points.length - 1]

    try {
      await firestore.collection('tracking').doc(params.jobId).set(
        {
          jobId: params.jobId,
          tradieId: params.tradieId,
          latitude: latest.lat,
          longitude: latest.lng,
          heading: latest.heading ?? 0,
          speedMetersPerSecond: latest.speedMetersPerSecond ?? 0,
          accuracy: latest.accuracy ?? null,
          etaSeconds: params.etaSeconds ?? null,
          distanceRemainingMeters: params.distanceRemainingMeters ?? null,
          routePolyline: params.routePolyline ?? null,
          status: 'COMMUTING',
          updatedAt: new Date().toISOString(),
          staleAfterSeconds: 20,
          batchSize: params.points.length,
        },
        { merge: true }
      )
    } catch (err) {
      console.warn('Firestore tracking write failed:', err)
      throw new AppError('Failed to update live tracking.', 502, 'TRACKING_WRITE_FAILED')
    }

    await db.insert(locationEvents).values({
      tradieId: params.tradieId,
      jobId: params.jobId,
      eventType: 'LOCATION_BATCH_RECORDED',
      metadata: {
        count: params.points.length,
        latest,
      },
      createdAt: new Date(),
    })
  }
}
