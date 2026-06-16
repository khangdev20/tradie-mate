// Using @react-native-community/geolocation for standard location access.
// For production background tracking, integrate transistorsoft's
// react-native-background-geolocation (requires commercial license).
import { PermissionsAndroid, Platform } from 'react-native'
import Geolocation from '@react-native-community/geolocation'
import api from './apiService'

const BATCH_INTERVAL_MS = 5000 // 5s — never more frequent
const MAX_BATCH_SIZE = 20
let locationBuffer: Array<{
  lat: number
  lng: number
  accuracy: number
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
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
    )
    return result === PermissionsAndroid.RESULTS.GRANTED
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

export async function startTracking(jobId: string) {
  activeJobId = jobId
  console.log('Starting GPS tracking for job:', jobId)

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
        recorded_at: new Date().toISOString(),
        job_id: jobId,
      })
    },
    (error) => {
      console.warn('Location error:', error)
      api.post('/maps/location-event', {
        jobId,
        eventType: 'STALE_LOCATION',
        metadata: { code: error.code, message: error.message },
      }).catch(() => undefined)
    },
    { enableHighAccuracy: true, distanceFilter: 10 }
  )

  intervalId = setInterval(async () => {
    if (locationBuffer.length === 0) return
    const batch = locationBuffer.splice(0, MAX_BATCH_SIZE)
    try {
      console.log('Flushing GPS batch:', batch.length, 'updates')
      await api.post('/maps/location-event', {
        jobId: activeJobId ?? jobId,
        eventType: 'LOCATION_BATCH_RECORDED',
        metadata: {
          count: batch.length,
          latest: batch[batch.length - 1],
        },
      })
    } catch {
      locationBuffer.unshift(...batch)
    }
  }, BATCH_INTERVAL_MS)
}

export function stopTracking() {
  console.log('Stopping GPS tracking')
  activeJobId = null
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
