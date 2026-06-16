// src/services/location.ts
import Geolocation from '@react-native-community/geolocation'
import api from './apiService'

const BATCH_INTERVAL_MS = 5000
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

export function getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    )
  })
}

export function startTracking(jobId: string) {
  activeJobId = jobId
  console.log('Starting GPS tracking for job:', jobId)

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
      api
        .post('/maps/location-event', {
          jobId,
          eventType: 'PERMISSION_DENIED',
          metadata: { code: error.code, message: error.message },
        })
        .catch(() => {})
    },
    { enableHighAccuracy: true, distanceFilter: 10 }
  )

  intervalId = setInterval(async () => {
    if (locationBuffer.length === 0) return
    const batch = locationBuffer.splice(0, 20)
    try {
      await api.post('/maps/location-event', {
        jobId: activeJobId,
        eventType: 'GPS_BATCH',
        metadata: { updates: batch },
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
