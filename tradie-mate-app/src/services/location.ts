// src/services/location.ts
// Using @react-native-community/geolocation for standard location access.
// For production background tracking, integrate transistorsoft's
// react-native-background-geolocation (requires commercial license).
// import Geolocation from '@react-native-community/geolocation'

const BATCH_INTERVAL_MS = 5000 // 5s — never more frequent
let locationBuffer: Array<{
  lat: number
  lng: number
  accuracy: number
  recorded_at: string
  job_id: string
}> = []
let intervalId: ReturnType<typeof setInterval> | null = null
let watchId: number | null = null

export function startTracking(jobId: string) {
  console.log('Starting GPS tracking for job:', jobId)

  /*
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
    (error) => console.warn('Location error:', error),
    { enableHighAccuracy: true, distanceFilter: 10 }
  )
  */

  // Batch flush every 5 seconds — never stream to server
  intervalId = setInterval(async () => {
    if (locationBuffer.length === 0) return
    const batch = locationBuffer.splice(0, 20) // max 20 per flush
    try {
      console.log('Flushing GPS batch:', batch.length, 'updates')
      // await api.post('/location/batch', { updates: batch })
    } catch {
      // Offline: push back to buffer, retry next interval
      locationBuffer.unshift(...batch)
    }
  }, BATCH_INTERVAL_MS)
}

export function stopTracking() {
  console.log('Stopping GPS tracking')
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
  if (watchId !== null) {
    // Geolocation.clearWatch(watchId)
    watchId = null
  }
  locationBuffer = []
}
