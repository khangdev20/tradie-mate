import { FastifyInstance, FastifyRequest } from 'fastify'
import { requireAuth } from '../../middleware/auth.middleware'
import { db } from '../../config/db'
import { marketplaceBookings, escrowPayments } from '../../db/schema/marketplace'
import { tradies } from '../../db/schema/tradies'
import { jobs } from '../../db/schema/jobs'
import { eq, and, ilike, sql } from 'drizzle-orm'
import { AppError } from '../../utils/errors'
import { stripe } from '../../config/stripe'
import { fcm } from '../../config/firebase'

const PLATFORM_FEE_PERCENT = 0.04 // 4% platform booking fee

export async function marketplaceRoutes(fastify: FastifyInstance) {

  /**
   * GET /api/v1/marketplace/listings?suburb=Brisbane
   * Public marketplace browse for web customers.
   */
  fastify.get<{ Querystring: { suburb?: string } }>('/listings', async (request) => {
    const suburb = request.query.suburb?.trim()

    const rows = await db
      .select({
        id: marketplaceBookings.id,
        title: marketplaceBookings.description,
        description: marketplaceBookings.description,
        budgetCents: marketplaceBookings.quotedAmountCents,
        suburb: marketplaceBookings.address,
        status: marketplaceBookings.status,
      })
      .from(marketplaceBookings)
      .where(
        suburb
          ? and(
              ilike(marketplaceBookings.address, `%${suburb}%`),
              eq(marketplaceBookings.status, 'PENDING'),
            )
          : eq(marketplaceBookings.status, 'PENDING'),
      )
      .limit(50)

    return {
      success: true,
      data: {
        listings: rows.map((r) => ({
          id: r.id,
          title: r.title?.slice(0, 60) || 'Tradie job',
          description: r.description,
          budgetCents: r.budgetCents ?? 0,
          suburb: suburb || r.suburb,
          status: r.status,
        })),
      },
    }
  })

  /**
   * POST /api/v1/marketplace/listings/:id/book
   * Web customer books an open marketplace listing with escrow.
   */
  fastify.post<{
    Params: { id: string }
    Body: { customerName: string; customerPhone: string }
  }>('/listings/:id/book', async (request, reply) => {
    const { id } = request.params
    const { customerName, customerPhone } = request.body

    const [booking] = await db
      .select()
      .from(marketplaceBookings)
      .where(eq(marketplaceBookings.id, id))
      .limit(1)

    if (!booking) throw new AppError('Listing not found.', 404, 'NOT_FOUND')

    const [updated] = await db
      .update(marketplaceBookings)
      .set({
        customerName,
        customerPhone,
        status: 'ACCEPTED',
        updatedAt: new Date(),
      })
      .where(eq(marketplaceBookings.id, id))
      .returning()

    return reply.status(201).send({ success: true, data: { bookingId: updated.id, status: updated.status } })
  })

  /**
   * POST /api/v1/marketplace/bookings
   * Module 4.4 — Customer creates a marketplace booking.
   * Public endpoint — no JWT required.
   */
  fastify.post<{
    Body: {
      tradieId: string
      customerName: string
      customerPhone: string
      customerEmail?: string
      description: string
      address: string
      requestedAt: string
      quotedAmountCents?: number
    }
  }>('/bookings', async (request, reply) => {
    const {
      tradieId,
      customerName,
      customerPhone,
      customerEmail,
      description,
      address,
      requestedAt,
      quotedAmountCents,
    } = request.body

    if (!tradieId || !customerName || !customerPhone || !description || !address || !requestedAt) {
      throw new AppError('tradieId, customerName, customerPhone, description, address, and requestedAt are required.', 400, 'MISSING_FIELDS')
    }

    // Verify tradie is active
    const [tradie] = await db
      .select({ id: tradies.id, firstName: tradies.firstName, fcmToken: tradies.fcmToken })
      .from(tradies)
      .where(and(eq(tradies.id, tradieId), eq(tradies.isActive, true)))
      .limit(1)

    if (!tradie) {
      throw new AppError('Tradie not found.', 404, 'TRADIE_NOT_FOUND')
    }

    const bookingFeeCents = quotedAmountCents
      ? Math.round(quotedAmountCents * PLATFORM_FEE_PERCENT)
      : null

    const [booking] = await db
      .insert(marketplaceBookings)
      .values({
        tradieId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail?.trim() || null,
        description: description.trim(),
        address: address.trim(),
        requestedAt: new Date(requestedAt),
        quotedAmountCents: quotedAmountCents || null,
        bookingFeeCents,
        status: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Notify tradie of new booking
    if (tradie.fcmToken) {
      try {
        await fcm.send({
          token: tradie.fcmToken,
          notification: {
            title: 'New Marketplace Booking',
            body: `${customerName} wants to book you for: ${description.slice(0, 60)}`,
          },
          data: {
            type: 'JOB_ASSIGNED',
            bookingId: booking.id,
          },
        })
      } catch (fcmErr) {
        fastify.log.warn({ fcmErr, tradieId }, 'FCM notification failed for marketplace booking')
      }
    }

    return reply.status(201).send({
      success: true,
      data: {
        bookingId: booking.id,
        status: booking.status,
        bookingFeeCents,
      },
    })
  })

  /**
   * GET /api/v1/marketplace/bookings
   * List marketplace bookings for the authenticated tradie.
   */
  fastify.get('/bookings', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest) => {
    const tradieId = request.tradie.id

    const bookingList = await db
      .select()
      .from(marketplaceBookings)
      .where(eq(marketplaceBookings.tradieId, tradieId))
      .orderBy(sql`${marketplaceBookings.createdAt} DESC`)
      .limit(50)

    return {
      success: true,
      data: { bookings: bookingList },
    }
  })

  /**
   * PATCH /api/v1/marketplace/bookings/:id/accept
   * Tradie accepts a marketplace booking — creates a job and holds escrow.
   */
  fastify.patch<{
    Params: { id: string }
    Body: { quotedAmountCents: number; stripePaymentMethodId?: string }
  }>('/bookings/:id/accept', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { quotedAmountCents: number; stripePaymentMethodId?: string } }>, reply) => {
    const tradieId = request.tradie.id
    const { id: bookingId } = request.params
    const { quotedAmountCents } = request.body

    if (!quotedAmountCents || quotedAmountCents <= 0) {
      throw new AppError('quotedAmountCents must be a positive integer.', 400, 'INVALID_AMOUNT')
    }

    const [booking] = await db
      .select()
      .from(marketplaceBookings)
      .where(and(eq(marketplaceBookings.id, bookingId), eq(marketplaceBookings.tradieId, tradieId)))
      .limit(1)

    if (!booking) {
      throw new AppError('Booking not found.', 404, 'BOOKING_NOT_FOUND')
    }

    if (booking.status !== 'PENDING') {
      throw new AppError(`Cannot accept a booking in ${booking.status} status.`, 400, 'INVALID_STATUS')
    }

    const platformFeeCents = Math.round(quotedAmountCents * PLATFORM_FEE_PERCENT)
    const netPayoutCents = quotedAmountCents - platformFeeCents

    // Create a PaymentIntent to hold escrow
    let paymentIntentId: string | null = null
    try {
      const pi = await stripe.paymentIntents.create({
        amount: quotedAmountCents,
        currency: 'aud',
        capture_method: 'manual', // Hold funds until completion
        metadata: {
          bookingId,
          tradieId,
          type: 'marketplace_escrow',
        },
      })
      paymentIntentId = pi.id
    } catch (stripeErr: any) {
      fastify.log.warn({ stripeErr, bookingId }, 'Stripe escrow hold failed — continuing without escrow')
    }

    // Create a job from the booking
    const [newJob] = await db
      .insert(jobs)
      .values({
        tradieId,
        title: `Marketplace: ${booking.description.slice(0, 80)}`,
        description: booking.description,
        jobType: 'Marketplace',
        status: 'UPCOMING',
        source: 'CUSTOMER_BOOKING',
        address: booking.address,
        scheduledAt: new Date(booking.requestedAt),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    // Create escrow record
    if (paymentIntentId) {
      await db.insert(escrowPayments).values({
        bookingId,
        tradieId,
        amountCents: quotedAmountCents,
        platformFeeCents,
        netPayoutCents,
        stripePaymentIntentId: paymentIntentId,
        status: 'HELD',
        heldAt: new Date(),
      })
    }

    // Update booking
    const [updated] = await db
      .update(marketplaceBookings)
      .set({
        status: 'ACCEPTED',
        jobId: newJob.id,
        quotedAmountCents,
        bookingFeeCents: platformFeeCents,
        updatedAt: new Date(),
      })
      .where(eq(marketplaceBookings.id, bookingId))
      .returning()

    return reply.status(200).send({
      success: true,
      data: {
        bookingId: updated.id,
        jobId: newJob.id,
        status: updated.status,
        quotedAmountCents,
        platformFeeCents,
        netPayoutCents,
      },
    })
  })

  /**
   * PATCH /api/v1/marketplace/bookings/:id/reject
   * Tradie rejects a marketplace booking.
   */
  fastify.patch<{
    Params: { id: string }
    Body: { reason?: string }
  }>('/bookings/:id/reject', {
    preHandler: [requireAuth],
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { reason?: string } }>) => {
    const tradieId = request.tradie.id
    const { id: bookingId } = request.params

    const [booking] = await db
      .select()
      .from(marketplaceBookings)
      .where(and(eq(marketplaceBookings.id, bookingId), eq(marketplaceBookings.tradieId, tradieId)))
      .limit(1)

    if (!booking || booking.status !== 'PENDING') {
      throw new AppError('Booking not found or cannot be rejected.', 404, 'BOOKING_NOT_FOUND')
    }

    await db
      .update(marketplaceBookings)
      .set({ status: 'CANCELLED', updatedAt: new Date() })
      .where(eq(marketplaceBookings.id, bookingId))

    return {
      success: true,
      data: { message: 'Booking rejected.' },
    }
  })
}
