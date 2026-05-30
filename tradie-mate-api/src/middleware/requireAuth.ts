import { FastifyReply, FastifyRequest } from 'fastify'
import { eq } from 'drizzle-orm'
import { supabaseAuth } from '../config/supabase'
import { db } from '../config/db'
import { tradies } from '../db/schema/tradies'

import { env } from '../config/env'

export const requireAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const token = request.headers.authorization?.replace('Bearer ', '')
  if (!token) {
    return reply.status(401).send({ error: 'Authentication required' })
  }

  let user: any = null
  let error: any = null

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
      error = err
    } catch (e: any) {
      error = e
    }
  }
  
  if (error || !user) {
    if (error?.message?.includes('expired')) {
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
