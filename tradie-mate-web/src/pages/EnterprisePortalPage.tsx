'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { AppCard, AppButton, EmptyState, StatusBadge } from '@tradiemate/ui'
import { apiPost } from '@/lib/api'

type DispatchJob = {
  id: string
  title: string
  status: string
  propertyAddress: string
  scheduledAt: string
}

export function EnterprisePortalPage() {
  const [apiKey, setApiKey] = useState('')
  const [orgId, setOrgId] = useState('')

  const { data, refetch, isFetching } = useQuery({
    queryKey: ['enterprise-jobs', orgId, apiKey],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
      const res = await fetch(`${apiBase}/enterprise/organizations/${orgId}/jobs`, {
        headers: { 'x-enterprise-api-key': apiKey },
      })
      if (!res.ok) throw new Error('Failed to load jobs')
      const json = await res.json()
      return json.data as { jobs: DispatchJob[] }
    },
    enabled: false,
  })

  const dispatch = useMutation({
    mutationFn: (jobId: string) =>
      apiPost(`/enterprise/jobs/${jobId}/dispatch`, { tradieId: 'auto' }),
  })

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      <AppCard>
        <h1>Enterprise Property Portal</h1>
        <p>Dispatch verified tradies to property maintenance jobs.</p>
        <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
          <input
            placeholder="Organization ID"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: '0.5px solid #E5E5E0' }}
          />
          <input
            placeholder="Enterprise API Key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            style={{ padding: 12, borderRadius: 8, border: '0.5px solid #E5E5E0' }}
          />
          <AppButton onClick={() => refetch()} disabled={!orgId || isFetching}>
            Load job queue
          </AppButton>
        </div>
      </AppCard>

      <div style={{ marginTop: 24 }}>
        {!data?.jobs?.length ? (
          <EmptyState title="No jobs loaded" description="Enter your org ID and API key to view the dispatch queue." />
        ) : (
          data.jobs.map((job) => (
            <AppCard key={job.id} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <h3 style={{ margin: 0 }}>{job.title}</h3>
                  <p>{job.propertyAddress}</p>
                  <small>{new Date(job.scheduledAt).toLocaleString('en-AU')}</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <StatusBadge label={job.status} variant="info" />
                  <AppButton
                    style={{ marginTop: 8 }}
                    onClick={() => dispatch.mutate(job.id)}
                    disabled={dispatch.isPending}
                  >
                    Dispatch
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
