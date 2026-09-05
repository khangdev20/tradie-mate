import { FastifyInstance } from 'fastify'
import { db } from '../../config/db'
import { jobs } from '../../db/schema/jobs'
import { tradies } from '../../db/schema/tradies'
import { reviews } from '../../db/schema/reviews'
import { trackingSessions } from '../../db/schema/location'
import { firestore } from '../../config/firebase'
import { eq, and, desc } from 'drizzle-orm'
import { AppError } from '../../utils/errors'

export async function publicRoutes(fastify: FastifyInstance) {
  /**
   * GET /public/track/:token
   * Customer-facing live tracking (no auth).
   */
  fastify.get<{ Params: { token: string } }>('/track/:token', async (request) => {
    const { token } = request.params

    const [job] = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        trackingTokenExpiresAt: jobs.trackingTokenExpiresAt,
        tradieId: jobs.tradieId,
      })
      .from(jobs)
      .where(eq(jobs.trackingToken, token))
      .limit(1)

    if (!job) {
      throw new AppError('Tracking link not found.', 404, 'NOT_FOUND')
    }

    if (job.trackingTokenExpiresAt && new Date(job.trackingTokenExpiresAt) < new Date()) {
      throw new AppError('Tracking link has expired.', 410, 'TRACKING_EXPIRED')
    }

    const [tradie] = await db
      .select({
        firstName: tradies.firstName,
        lastName: tradies.lastName,
        vehicleColor: tradies.vehicleColor,
        vehicleMake: tradies.vehicleMake,
        vehiclePlate: tradies.vehiclePlate,
      })
      .from(tradies)
      .where(eq(tradies.id, job.tradieId))
      .limit(1)

    const [session] = await db
      .select()
      .from(trackingSessions)
      .where(eq(trackingSessions.jobId, job.id))
      .limit(1)

    let latitude = 0
    let longitude = 0
    let etaSeconds: number | null = null
    let routePolyline: string | null = null
    let firestoreStatus = job.status

    try {
      const snap = await firestore.collection('tracking').doc(job.id).get()
      if (snap.exists) {
        const data = snap.data() as any
        latitude = data.latitude ?? 0
        longitude = data.longitude ?? 0
        etaSeconds = data.etaSeconds ?? null
        routePolyline = data.routePolyline ?? null
        firestoreStatus = data.status ?? job.status
      }
    } catch {
      // Firestore optional in dev
    }

    const plateParts = [tradie?.vehicleColor, tradie?.vehicleMake, tradie?.vehiclePlate].filter(Boolean)

    return {
      success: true,
      data: {
        tradieName: `${tradie?.firstName ?? ''} ${tradie?.lastName ?? ''}`.trim(),
        plateDisplay: plateParts.join(' · ') || 'TradieMate Vehicle',
        status: firestoreStatus,
        etaSeconds,
        latitude,
        longitude,
        routePolyline,
        jobTitle: job.title,
        isActive: session?.isActive ?? false,
      },
    }
  })

  /**
   * GET /public/profiles/:slug
   * Public tradie profile page.
   */
  fastify.get<{ Params: { slug: string } }>('/profiles/:slug', async (request) => {
    const { slug } = request.params

    const [tradie] = await db
      .select({
        id: tradies.id,
        firstName: tradies.firstName,
        lastName: tradies.lastName,
        tradeType: tradies.tradeType,
        bio: tradies.bio,
        avgRating: tradies.avgRating,
        totalReviews: tradies.totalReviews,
        licenceVerified: tradies.licenceVerified,
        insuranceVerified: tradies.insuranceVerified,
        hourlyRateCents: tradies.hourlyRateCents,
        hourlyRatePublic: tradies.hourlyRatePublic,
      })
      .from(tradies)
      .where(and(eq(tradies.publicProfileSlug, slug), eq(tradies.publicProfileEnabled, true)))
      .limit(1)

    if (!tradie) {
      throw new AppError('Profile not found.', 404, 'NOT_FOUND')
    }

    const tradieReviews = await db
      .select({
        rating: reviews.rating,
        comment: reviews.body,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(and(eq(reviews.tradieId, tradie.id), eq(reviews.isPublic, true)))
      .orderBy(desc(reviews.createdAt))
      .limit(20)

    return {
      success: true,
      data: {
        ...tradie,
        avgRating: Number(tradie.avgRating),
        reviews: tradieReviews.map((r) => ({
          rating: r.rating,
          comment: r.comment ?? '',
          createdAt: r.createdAt,
        })),
      },
    }
  })
}
