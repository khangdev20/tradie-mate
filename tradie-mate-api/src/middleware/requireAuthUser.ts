import { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { supabaseAuth } from '../config/supabase'
import { db } from '../config/db'
import { tradies } from '../db/schema/tradies'
import { env } from '../config/env'

/**
 * requireAuthUser — JWT must be valid, tradie row is optional.
 * Use for onboarding routes where a user has authenticated via OTP
 * but hasn't yet created their tradie profile.
 *
 * Sets request.user always.
 * Sets request.tradie if a tradie row exists (may be null/undefined).
 */
export const requireAuthUser = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
      code: 'AUTH_REQUIRED',
    })
  }

  let user: any = null
  let authError: any = null

  // Dev mock token support
  if (env.NODE_ENV === 'development' && token.startsWith('mock-token')) {
    user = {
      id: '00000000-0000-0000-0000-000000000000',
      aud: 'authenticated',
      email: 'test@tradiemate.com',
      phone: '+61412345678',
      app_metadata: {},
      user_metadata: { first_name: 'Dave', last_name: 'Plumber', trade_type: 'PLUMBER' },
      exp: Math.floor(Date.now() / 1000) + 3600 * 24 * 365,
    }
  } else {
    try {
      const { data, error: err } = await supabaseAuth.auth.getUser(token)
      user = data?.user
      authError = err
    } catch (e: any) {
      authError = e
    }
  }

  if (authError || !user) {
    if (authError?.message?.includes('expired')) {
      return reply.status(401).send({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      })
    }
    return reply.status(401).send({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    })
  }

  // Check token expiry manually as backup
  const now = Math.floor(Date.now() / 1000)
  if (user.aud === 'authenticated' && user.app_metadata && (user as any).exp < now) {
    return reply.status(401).send({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    })
  }

  request.user = user

  // Optionally attach tradie if it exists — does NOT block if missing
  const [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (tradie) {
    request.tradie = tradie
  }
}
