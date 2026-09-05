'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppCard, AppButton, EmptyState, StatusBadge } from '@tradiemate/ui'
import { apiGet, apiPost } from '@/lib/api'

function formatAUD(cents: number) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(cents / 100)
}

type Listing = {
  id: string
  title: string
  description: string
  budgetCents: number
  suburb: string
  status: string
}

export function MarketplacePage() {
  const [suburb, setSuburb] = useState('Brisbane')

  const { data, refetch } = useQuery({
    queryKey: ['marketplace', suburb],
    queryFn: () => apiGet<{ listings: Listing[] }>(`/marketplace/listings?suburb=${encodeURIComponent(suburb)}`),
    enabled: !!suburb,
  })

  const book = useMutation({
    mutationFn: (listingId: string) =>
      apiPost(`/marketplace/listings/${listingId}/book`, {
        customerName: 'Web Customer',
        customerPhone: '+61400000001',
      }),
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <AppCard>
        <h1>TradieMate Marketplace</h1>
        <p>Book verified local tradies with escrow-protected payments.</p>
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          <input
            value={suburb}
            onChange={(e) => setSuburb(e.target.value)}
            placeholder="Suburb"
            style={{ flex: 1, padding: 12, borderRadius: 8, border: '0.5px solid #E5E5E0' }}
          />
          <AppButton onClick={() => refetch()}>Search</AppButton>
        </div>
      </AppCard>

      <div style={{ marginTop: 24 }}>
        {!data?.listings?.length ? (
          <EmptyState title="No listings" description="Try another suburb or check back later." />
        ) : (
          data.listings.map((listing) => (
            <AppCard key={listing.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{listing.title}</h3>
                  <p>{listing.description}</p>
                  <p>{listing.suburb} · {formatAUD(listing.budgetCents)}</p>
                </div>
                <div>
                  <StatusBadge label={listing.status} />
                  <AppButton
                    style={{ marginTop: 8 }}
                    onClick={() => book.mutate(listing.id)}
                    disabled={book.isPending}
                  >
                    Book with escrow
                  </AppButton>
                </div>
              </div>
            </AppCard>
          ))
        )}
      </div>
    </div>
  )
}
