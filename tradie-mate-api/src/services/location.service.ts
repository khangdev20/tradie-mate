// src/services/location.service.ts
import { db } from '../config/db'
import { locationPings, trackingSessions } from '../db/schema'
import { eq, and } from 'drizzle-orm'
import { firestore } from '../config/firebase'

interface LocationUpdate {
  lat: string; lng: string; accuracy?: number
  speed?: number; heading?: number; altitude?: number
  recorded_at: string; job_id?: string
}

export async function batchInsertLocations(
  tradieId: string,
  updates: LocationUpdate[]
) {
  // 1. Bulk INSERT — 1 SQL round-trip for all 20 rows
  const inserted = await db
    .insert(locationPings)
    .values(updates.map(u => ({
      tradieId,
      jobId:      u.job_id ?? null,
      lat:        u.lat,
      lng:        u.lng,
      accuracy:   u.accuracy ?? null,
      speed:      u.speed ?? null,
      heading:    u.heading ?? null,
      altitude:   u.altitude ?? null,
      recordedAt: new Date(u.recorded_at),
    })))
    .returning({ id: locationPings.id })

  // 2. Write ONLY latest point to Firestore (no flood)
  const latest = updates[updates.length - 1]
  if (latest) {
    const [session] = await db
      .select()
      .from(trackingSessions)
      .where(and(
        eq(trackingSessions.tradieId, tradieId),
        eq(trackingSessions.isActive, true)
      ))
      .limit(1)

    if (session) {
      await firestore
        .collection('tracking')
        .doc(session.jobId)
        .set({
          lat:         parseFloat(latest.lat),
          lng:         parseFloat(latest.lng),
          updatedAt:   new Date(),
          etaMinutes:  session.etaMinutes,
        }, { merge: true })
    }
  }

  return { accepted: inserted.length }
}
