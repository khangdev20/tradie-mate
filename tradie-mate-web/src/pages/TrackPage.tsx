import { useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import mapboxgl from 'mapbox-gl'
import { AppCard, StatusBadge, MapPanel, EmptyState, AppButton } from '@tradiemate/ui'
import { apiGet } from '../lib/api'

type TrackData = {
  tradieName: string
  plateDisplay: string
  status: string
  etaSeconds: number | null
  latitude: number
  longitude: number
  routePolyline: string | null
  jobTitle: string
  isActive: boolean
}

export function TrackPage() {
  const { token } = useParams<{ token: string }>()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<mapboxgl.Map | null>(null)

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['track', token],
    queryFn: () => apiGet<TrackData>(`/public/track/${token}`),
    enabled: !!token,
    refetchInterval: 10000,
  })

  useEffect(() => {
    if (!mapRef.current || !data?.latitude) return
    const token = import.meta.env.VITE_MAPBOX_TOKEN
    if (!token) return

    mapboxgl.accessToken = token
    if (!mapInstance.current) {
      mapInstance.current = new mapboxgl.Map({
        container: mapRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [data.longitude, data.latitude],
        zoom: 13,
      })
    } else {
      mapInstance.current.setCenter([data.longitude, data.latitude])
    }

    new mapboxgl.Marker({ color: '#2E6B45' })
      .setLngLat([data.longitude, data.latitude])
      .addTo(mapInstance.current)

    return () => {
      mapInstance.current?.remove()
      mapInstance.current = null
    }
  }, [data?.latitude, data?.longitude])

  if (isLoading) return <EmptyState title="Loading tracking…" />
  if (error || !data) return <EmptyState title="Tracking link expired or invalid" description={String(error)} />

  const etaMin = data.etaSeconds ? Math.ceil(data.etaSeconds / 60) : null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16 }}>
      <AppCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0 }}>{data.tradieName} is on the way</h2>
            <p style={{ color: '#6B6B66' }}>{data.jobTitle}</p>
          </div>
          <StatusBadge label={data.status} variant={data.isActive ? 'success' : 'neutral'} />
        </div>
        <p style={{ marginTop: 12 }}>Vehicle: {data.plateDisplay}</p>
        {etaMin && <p>ETA: ~{etaMin} min</p>}
        <AppButton onClick={() => refetch()} style={{ marginTop: 12 }}>Refresh</AppButton>
      </AppCard>
      <MapPanel height={320}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </MapPanel>
    </div>
  )
}
