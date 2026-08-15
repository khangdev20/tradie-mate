// GPS tracking during commute — batches to Firestore + API (max 20 points / 5s).
import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from '@react-native-community/geolocation'
import firestore from '@react-native-firebase/firestore'
import api from './apiService'

const BATCH_INTERVAL_MS = 5000
const MAX_BATCH_SIZE = 20

let locationBuffer: Array<{
  lat: number
  lng: number
  accuracy: number
  heading?: number
  speedMetersPerSecond?: number
  recorded_at: string
  job_id: string
}> = []
let intervalId: ReturnType<typeof setInterval> | null = null
let watchId: number | null = null
let activeJobId: string | null = null

export type LatLng = {
  latitude: number
  longitude: number
}

export async function requestForegroundLocationPermission() {
  if (Platform.OS === 'android') {
    const fine = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    )
    if (fine !== PermissionsAndroid.RESULTS.GRANTED) return false

    if (Platform.Version >= 29) {
      const background = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION
      )
      return background === PermissionsAndroid.RESULTS.GRANTED || fine === PermissionsAndroid.RESULTS.GRANTED
    }
    return true
  }

  Geolocation.requestAuthorization()
  return true
}

export async function getCurrentPosition(): Promise<LatLng & { accuracy: number }> {
  const granted = await requestForegroundLocationPermission()
  if (!granted) {
    await api.post('/maps/location-event', {
      eventType: 'PERMISSION_DENIED',
      metadata: { scope: 'foreground' },
    }).catch(() => undefined)
    throw new Error('Location permission denied')
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      async (error) => {
        await api.post('/maps/location-event', {
          eventType: 'STALE_LOCATION',
          metadata: { message: error.message },
        }).catch(() => undefined)
        reject(error)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  })
}

export async function getCurrentLocation(): Promise<LatLng & { accuracyMeters?: number }> {
  const position = await getCurrentPosition()
  return {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracyMeters: position.accuracy,
  }
}

async function flushBatch(jobId: string) {
  if (locationBuffer.length === 0) return

  const batch = locationBuffer.splice(0, MAX_BATCH_SIZE)
  const latest = batch[batch.length - 1]

  try {
    await api.post('/maps/location-batch', {
      jobId,
      points: batch.map(({ job_id, ...point }) => point),
    })

    await firestore()
      .collection('tracking')
      .doc(jobId)
      .set(
        {
          jobId,
          latitude: latest.lat,
          longitude: latest.lng,
          heading: latest.heading ?? 0,
          speedMetersPerSecond: latest.speedMetersPerSecond ?? 0,
          accuracy: latest.accuracy,
          status: 'COMMUTING',
          updatedAt: firestore.FieldValue.serverTimestamp(),
          staleAfterSeconds: 20,
        },
        { merge: true }
      )
  } catch (err) {
    console.warn('GPS batch flush failed, re-queuing:', err)
    locationBuffer.unshift(...batch)
  }
}

export async function startTracking(jobId: string) {
  activeJobId = jobId

  const granted = await requestForegroundLocationPermission()
  if (!granted) {
    await api.post('/maps/location-event', {
      jobId,
      eventType: 'PERMISSION_DENIED',
      metadata: { scope: 'foreground' },
    }).catch(() => undefined)
    return
  }

  await api.post('/maps/location-event', {
    jobId,
    eventType: 'ROUTE_STARTED',
  }).catch(() => undefined)

  watchId = Geolocation.watchPosition(
    (position) => {
      locationBuffer.push({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        heading: position.coords.heading ?? undefined,
        speedMetersPerSecond: position.coords.speed ?? undefined,
        recorded_at: new Date().toISOString(),
        job_id: jobId,
      })
    },
    (error) => {
      api.post('/maps/location-event', {
        jobId,
        eventType: 'STALE_LOCATION',
        metadata: { code: error.code, message: error.message },
      }).catch(() => undefined)
    },
    { enableHighAccuracy: true, distanceFilter: 10 }
  )

  intervalId = setInterval(() => {
    void flushBatch(activeJobId ?? jobId)
  }, BATCH_INTERVAL_MS)
}

export async function stopTracking() {
  const jobId = activeJobId
  activeJobId = null

  if (jobId && locationBuffer.length > 0) {
    await flushBatch(jobId).catch(() => undefined)
  }

  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (watchId !== null) {
    Geolocation.clearWatch(watchId)
    watchId = null
  }
  locationBuffer = []
}
