import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { reviews } from '../../db/schema/reviews'
import { jobs } from '../../db/schema/jobs'
import { invoices } from '../../db/schema/invoices'
import { tradies } from '../../db/schema/tradies'
import { eq, and, avg, count, sql } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function reviewRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/v1/reviews
   * Public endpoint — customer submits a review using their tracking token.
   * Header: X-Tracking-Token: <token>
   */
  fastify.post<{
    Body: { jobId: string; rating: number; reviewText: string; title?: string }
  }>('/', async (request, reply) => {
    const trackingToken = request.headers['x-tracking-token'] as string | undefined

    if (!trackingToken) {
      throw new AppError('X-Tracking-Token header is required.', 401, 'MISSING_TRACKING_TOKEN')
    }

    const { jobId, rating, reviewText, title } = request.body

    if (!jobId) {
      throw new AppError('jobId is required.', 400, 'MISSING_JOB_ID')
    }
    if (!rating || rating < 1 || rating > 5) {
      throw new AppError('Rating must be between 1 and 5.', 400, 'INVALID_RATING')
    }
    if (!reviewText || reviewText.trim().length < 10) {
      throw new AppError('Review text must be at least 10 characters.', 400, 'REVIEW_TOO_SHORT')
    }

    // Validate tracking token against the job
    const [job] = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), eq(jobs.trackingToken, trackingToken)))
      .limit(1)

    if (!job) {
      throw new AppError('Invalid tracking token or job not found.', 401, 'INVALID_TRACKING_TOKEN')
    }

    // Job must be COMPLETED and paid
    if (job.status !== 'COMPLETED') {
      throw new AppError('Reviews can only be submitted for completed jobs.', 400, 'JOB_NOT_COMPLETED')
    }

    // Check invoice is PAID
    const [invoice] = await db
      .select({ status: invoices.status })
      .from(invoices)
      .where(eq(invoices.jobId, jobId))
      .limit(1)

    if (!invoice || invoice.status !== 'PAID') {
      throw new AppError('Reviews require a paid invoice for this job.', 400, 'INVOICE_NOT_PAID')
    }

    // Prevent duplicate reviews for the same job
    const [existing] = await db
      .select({ id: reviews.id })
      .from(reviews)
      .where(eq(reviews.jobId, jobId))
      .limit(1)

    if (existing) {
      throw new AppError('A review has already been submitted for this job.', 409, 'DUPLICATE_REVIEW')
    }

    const [newReview] = await db
      .insert(reviews)
      .values({
        tradieId: job.tradieId,
        jobId,
        rating,
        title: title?.trim() || null,
        body: reviewText.trim(),
        jobType: job.jobType || null,
        isPublic: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Update tradie's denormalized avg rating
    await updateTradieRating(job.tradieId)

    return reply.status(201).send({
      success: true,
      data: { id: newReview.id },
    })
  })

  /**
   * PATCH /api/v1/reviews/:id/reply
   * Protected — tradie replies to a review they received.
   */
  fastify.patch<{
    Params: { id: string }
    Body: { responseText: string }
  }>('/:id/reply', {
    preHandler: [requireAuth],
  }, async (request) => {
    const { id: reviewId } = request.params
    const { responseText } = request.body
    const tradieId = request.tradie.id

    if (!responseText || responseText.trim().length < 1) {
      throw new AppError('Response text is required.', 400, 'MISSING_RESPONSE')
    }

    // Verify the review belongs to this tradie
    const [review] = await db
      .select()
      .from(reviews)
      .where(and(eq(reviews.id, reviewId), eq(reviews.tradieId, tradieId)))
      .limit(1)

    if (!review) {
      throw new AppError('Review not found or you do not have permission to reply.', 404, 'REVIEW_NOT_FOUND')
    }

    const [updated] = await db
      .update(reviews)
      .set({
        replyBody: responseText.trim(),
        repliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning()

    return {
      success: true,
      data: {
        reviewId: updated.id,
        responseText: updated.replyBody,
        repliedAt: updated.repliedAt,
      },
    }
  })

  /**
   * GET /api/v1/reviews
   * Protected — list all reviews for the authenticated tradie.
   */
  fastify.get('/', {
    preHandler: [requireAuth],
  }, async (request) => {
    const tradieId = request.tradie.id

    const tradieReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.tradieId, tradieId))
      .orderBy(sql`${reviews.createdAt} DESC`)

    return {
      success: true,
      data: { reviews: tradieReviews },
    }
  })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function updateTradieRating(tradieId: string) {
  try {
    const result = await db
      .select({
        avgRating: avg(reviews.rating),
        totalReviews: count(reviews.id),
      })
      .from(reviews)
      .where(and(eq(reviews.tradieId, tradieId), eq(reviews.isPublic, true)))

    const avgRatingVal = result[0]?.avgRating ?? '0'
    const totalReviewsVal = result[0]?.totalReviews ?? 0

    await db
      .update(tradies)
      .set({
        avgRating: String(parseFloat(String(avgRatingVal)).toFixed(2)),
        totalReviews: Number(totalReviewsVal),
        updatedAt: new Date(),
      })
      .where(eq(tradies.id, tradieId))
  } catch (err) {
    // Non-critical — denormalized stat update failure should not fail the request
    console.warn('Failed to update tradie avg rating:', err)
  }
}
