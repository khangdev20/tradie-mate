import { database } from '../database'
import { Job } from '../models/Job'

export interface LocalJobInput {
  id: string
  title: string
  status: string
  description?: string | null
  address?: string | null
  customerName?: string | null
  scheduledAt?: string | null
  photos?: string[] | null
  notes?: string | null
}

export async function saveLocalJobs(jobs: LocalJobInput[]): Promise<void> {
  await database.write(async () => {
    const localJobs = await database.get<Job>('jobs').query().fetch()
    const byServerId = new Map(localJobs.map((job) => [job.serverId, job]))

    for (const job of jobs) {
      const existing = byServerId.get(job.id)
      if (existing) {
        await existing.update((rec) => {
          rec.title = job.title
          rec.status = job.status
          rec.description = job.description ?? null
          rec.address = job.address ?? null
          rec.customerName = job.customerName ?? null
          rec.scheduledAt = job.scheduledAt ? Date.parse(job.scheduledAt) : null
          rec.photos = job.photos ? JSON.stringify(job.photos) : null
          rec.notes = job.notes ?? null
          rec.synced = true
        })
      } else {
        await database.get<Job>('jobs').create((rec) => {
          rec.serverId = job.id
          rec.title = job.title
          rec.status = job.status
          rec.description = job.description ?? null
          rec.address = job.address ?? null
          rec.customerName = job.customerName ?? null
          rec.scheduledAt = job.scheduledAt ? Date.parse(job.scheduledAt) : null
          rec.photos = job.photos ? JSON.stringify(job.photos) : null
          rec.notes = job.notes ?? null
          rec.synced = true
        })
      }
    }
  })
}

export async function getLocalJobs(): Promise<LocalJobInput[]> {
  const jobs = await database.get<Job>('jobs').query().fetch()
  return jobs.map((job) => ({
    id: job.serverId ?? job.id,
    title: job.title,
    status: job.status,
    description: job.description ?? null,
    address: job.address ?? null,
    customerName: job.customerName ?? null,
    scheduledAt: job.scheduledAt ? new Date(job.scheduledAt).toISOString() : null,
    photos: job.photos ? (JSON.parse(job.photos) as string[]) : null,
    notes: job.notes ?? null,
  }))
}
