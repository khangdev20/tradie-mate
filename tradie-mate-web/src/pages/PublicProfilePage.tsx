import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AppCard, StatusBadge, EmptyState } from '@tradiemate/ui'
import { apiGet } from '../lib/api'

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)
}

type Profile = {
  firstName: string
  lastName: string
  tradeType: string
  bio: string | null
  avgRating: number
  totalReviews: number
  licenceVerified: boolean
  insuranceVerified: boolean
  hourlyRateCents: number | null
  hourlyRatePublic: boolean
  reviews: { rating: number; comment: string; createdAt: string }[]
}

export function PublicProfilePage() {
  const { slug } = useParams<{ slug: string }>()

  const { data, isLoading, error } = useQuery({
    queryKey: ['profile', slug],
    queryFn: () => apiGet<Profile>(`/public/profiles/${slug}`),
    enabled: !!slug,
  })

  if (isLoading) return <EmptyState title="Loading profile…" />
  if (error || !data) return <EmptyState title="Profile not found" />

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 16 }}>
      <AppCard>
        <h1>{data.firstName} {data.lastName}</h1>
        <p>{data.tradeType.replace('_', ' ')}</p>
        {data.bio && <p>{data.bio}</p>}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          <StatusBadge label={`${data.avgRating} ★ (${data.totalReviews})`} variant="success" />
          {data.licenceVerified && <StatusBadge label="Licence verified" variant="info" />}
          {data.insuranceVerified && <StatusBadge label="Insured" variant="info" />}
        </div>
        {data.hourlyRatePublic && data.hourlyRateCents && (
          <p>From {formatAUD(data.hourlyRateCents)}/hr</p>
        )}
      </AppCard>

      <h3 style={{ marginTop: 24 }}>Reviews</h3>
      {data.reviews.length === 0 ? (
        <EmptyState title="No reviews yet" />
      ) : (
        data.reviews.map((r, i) => (
          <AppCard key={i} style={{ marginBottom: 12 }}>
            <strong>{'★'.repeat(r.rating)}</strong>
            <p>{r.comment}</p>
            <small>{new Date(r.createdAt).toLocaleDateString('en-AU')}</small>
          </AppCard>
        ))
      )}
    </div>
  )
}
