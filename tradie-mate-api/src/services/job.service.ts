import { db } from '../config/db'
import { jobs } from '../db/schema/jobs'
import { eq, and } from 'drizzle-orm'
import { AppError } from '../utils/errors'

export type JobStatus = 'DRAFT' | 'UPCOMING' | 'COMMUTING' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'INVOICED' | 'CANCELLED'

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

export class JobService {
  static validateTransition(currentStatus: JobStatus, targetStatus: JobStatus): boolean {
    // If it's the same status, it's a no-op / valid
    if (currentStatus === targetStatus) return true

    const allowed = VALID_TRANSITIONS[currentStatus] || []
    return allowed.includes(targetStatus)
  }

  static async getJobWithOwnerCheck(jobId: string, tradieId: string) {
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.tradieId, tradieId)))
      .limit(1)

    if (!job) {
      throw new AppError('Job not found or access denied', 404)
    }

    return job
  }

  static async transitionStatus(jobId: string, tradieId: string, targetStatus: JobStatus) {
    const job = await this.getJobWithOwnerCheck(jobId, tradieId)
    const currentStatus = job.status as JobStatus

    if (!this.validateTransition(currentStatus, targetStatus)) {
      throw new AppError(
        `Cannot transition status directly from ${currentStatus} to ${targetStatus}.`,
        400
      )
    }

    const updateFields: any = {
      status: targetStatus,
      updatedAt: new Date(),
    }

    // Set transition-specific lifecycle timestamps
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
