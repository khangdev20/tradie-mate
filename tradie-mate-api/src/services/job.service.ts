import { db } from '../config/db'
import { jobs } from '../db/schema/jobs'
import { customers } from '../db/schema/customers'
import { eq, and, sql } from 'drizzle-orm'
import { AppError } from '../utils/errors'
import { MapboxService } from './mapbox.service'

export type JobStatus =
  | 'DRAFT'
  | 'UPCOMING'
  | 'COMMUTING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INVOICED'
  | 'CANCELLED'

const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  DRAFT: ['UPCOMING', 'CANCELLED'],
  UPCOMING: ['COMMUTING', 'CANCELLED'],
  COMMUTING: ['ARRIVED', 'IN_PROGRESS', 'CANCELLED'],
  ARRIVED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: ['INVOICED', 'CANCELLED'],
  INVOICED: [],
  CANCELLED: [],
}

export interface CreateJobInput {
  title: string
  customerName?: string
  customerPhone?: string
  customerId?: string
  description?: string
  jobType?: string
  address: string
  scheduledAt?: string
  estimatedDurationMin?: number
  urgency?: 'EMERGENCY' | 'TODAY' | 'THIS_WEEK' | 'FLEXIBLE'
  source?: 'MANUAL' | 'PHONE_CALL' | 'CUSTOMER_BOOKING' | 'REFERRAL'
  notes?: string
}

export class JobService {
  static validateTransition(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
    if (currentStatus === targetStatus) return true
    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return allowed.includes(targetStatus)
  }

  static formatJobResponse(
    job: typeof jobs.$inferSelect,
    customer?: typeof customers.$inferSelect | null
  ) {
    return {
      ...job,
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
    }
  }

  static async findOrCreateCustomer(
    tradieId: string,
    name: string,
    phone: string,
    address?: string
  ) {
    const normalizedPhone = phone.replace(/\s/g, '')

    const [existing] = await db
      .select()
      .from(customers)
      .where(and(eq(customers.tradieId, tradieId), eq(customers.phone, normalizedPhone)))
      .limit(1)

    if (existing) {
      if (address && !existing.address) {
        await db
          .update(customers)
          .set({ address, updatedAt: new Date() })
          .where(eq(customers.id, existing.id))
      }
      return existing
    }

    const [created] = await db
      .insert(customers)
      .values({
        tradieId,
        name,
        phone: normalizedPhone,
        address: address ?? null,
        source: 'MANUAL',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return created
  }

  static async createJob(tradieId: string, input: CreateJobInput) {
    let customerId = input.customerId ?? null
    let customerRecord: typeof customers.$inferSelect | null = null

    if (!customerId && input.customerName && input.customerPhone) {
      customerRecord = await this.findOrCreateCustomer(
        tradieId,
        input.customerName,
        input.customerPhone,
        input.address
      )
      customerId = customerRecord.id
    } else if (customerId) {
      const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.tradieId, tradieId)))
        .limit(1)
      customerRecord = customer ?? null
    }

    let lat = '0'
    let lng = '0'
    try {
      const geocode = await MapboxService.geocodeAddress(input.address)
      lat = geocode.latitude.toString()
      lng = geocode.longitude.toString()
    } catch (err) {
      console.warn('Geocoding failed for job address:', err)
    }

    const [newJob] = await db
      .insert(jobs)
      .values({
        tradieId,
        customerId,
        title: input.title,
        description: input.description ?? null,
        jobType: input.jobType ?? 'Repair',
        status: 'UPCOMING',
        urgency: input.urgency ?? 'FLEXIBLE',
        source: input.source ?? 'MANUAL',
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : new Date(),
        estimatedDurationMin: input.estimatedDurationMin ?? 60,
        address: input.address,
        notes: input.notes ?? null,
        lat,
        lng,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    if (customerId) {
      await db
        .update(customers)
        .set({
          totalJobs: sql`total_jobs + 1`,
          lastJobAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customerId))
    }

    return this.formatJobResponse(newJob, customerRecord)
  }

  static async getJobWithOwnerCheck(jobId: string, tradieId: string) {
    const [row] = await db
      .select({ job: jobs, customer: customers })
      .from(jobs)
      .leftJoin(customers, eq(jobs.customerId, customers.id))
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
      .limit(1)

    if (!row) {
      throw new AppError('Job not found or you do not have permission to view it.', 404, 'JOB_NOT_FOUND')
    }

    return this.formatJobResponse(row.job, row.customer)
  }

  static async updateNotes(jobId: string, tradieId: string, notes: string) {
    await this.getJobWithOwnerCheck(jobId, tradieId)

    const [updated] = await db
      .update(jobs)
      .set({ notes, updatedAt: new Date() })
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
      .returning()

    return updated
  }

  static async transitionStatus(jobId: string, tradieId: string, targetStatus: JobStatus) {
    const job = await this.getJobWithOwnerCheck(jobId, tradieId)
    const currentStatus = job.status as JobStatus

    if (!this.validateTransition(currentStatus, targetStatus)) {
      throw new AppError(
        `Cannot transition status directly from ${currentStatus} to ${targetStatus}.`,
        400,
        'INVALID_JOB_TRANSITION'
      )
    }

    const updateFields: Record<string, unknown> = {
      status: targetStatus,
      updatedAt: new Date(),
    }

    if (targetStatus === 'COMMUTING') {
      updateFields.commutingStartedAt = new Date()
    } else if (targetStatus === 'ARRIVED') {
      updateFields.arrivedAt = new Date()
    } else if (targetStatus === 'IN_PROGRESS') {
      updateFields.startedAt = new Date()
    } else if (targetStatus === 'COMPLETED') {
      updateFields.completedAt = new Date()
    }

    const [updatedJob] = await db
      .update(jobs)
      .set(updateFields)
      .where(eq(jobs.id, jobId))
      .returning()

    return updatedJob
  }
}
