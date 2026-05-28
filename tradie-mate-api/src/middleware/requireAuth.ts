import { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { supabaseAuth } from '../config/supabase'
import { db } from '../config/db'
import { tradies } from '../db/schema/tradies'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' })
  }

  const { data: { user }, error } = await supabaseAuth.auth.getUser(token)
  
  if (error || !user) {
    // Check for specific expiry error if possible, or just return 401
    // Supabase JS doesn't always give a clear 'TOKEN_EXPIRED' code in getUser
    // but the error message often contains 'expired'
    if (error?.message.includes('expired')) {
      return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return reply.status(401).send({ error: 'Invalid token' })
  }

  // Check token expiry manually as backup
  const now = Math.floor(Date.now() / 1000)
  if (user.aud === 'authenticated' && user.app_metadata && (user as any).exp < now) {
     return reply.status(401).send({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
  }

  const [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (!tradie) {
    return reply.status(403).send({ error: 'Tradie profile not found', code: 'TRADIE_NOT_FOUND' })
  }

  if (!tradie.isActive) {
    return reply.status(403).send({ error: 'Account is inactive', code: 'ACCOUNT_INACTIVE' })
  }

  request.user = user
  request.tradie = tradie
}

export const requireABN = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.tradie.abnVerifiedAt) {
    return reply.status(403).send({ error: 'ABN verification required', code: 'ABN_REQUIRED' })
  }
}

export const requireVerified = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.tradie.licenceVerified) {
    return reply.status(403).send({ error: 'Licence verification required', code: 'UNVERIFIED' })
  }
}

export const requireOnboarded = async (request: FastifyRequest, reply: FastifyReply) => {
  if (!request.tradie.isOnboarded) {
    return reply.status(403).send({ error: 'Onboarding incomplete', code: 'ONBOARDING_INCOMPLETE' })
  }
}
