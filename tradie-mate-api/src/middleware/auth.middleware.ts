// src/middleware/auth.middleware.ts
import { db } from '../config/db'
import { tradies } from '../db/schema'
import { eq } from 'drizzle-orm'
import { supabaseAdmin } from '../config/supabase'
import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader

  if (!token) {
    return reply.status(401).send({ error: 'Missing token', code: 'UNAUTHORIZED' })
  }

  // Verify Supabase JWT
  let user: any = null
  if (process.env.NODE_ENV === 'development' && token.startsWith('mock-token-')) {
    const [testTradie] = await db
      .select()
      .from(tradies)
      .where(eq(tradies.email, 'test@tradiemate.com'))
      .limit(1)
      
    if (testTradie) {
      req.user = { id: testTradie.authUserId, email: testTradie.email } as any
      req.tradie = testTradie
      return
    }
  }

  const { data: { user: supabaseUser }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !supabaseUser) {
    return reply.status(401).send({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' })
  }
  user = supabaseUser

  // Fetch tradie from DB — Drizzle query
  const [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (!tradie) {
    return reply.status(403).send({ error: 'Tradie profile not found', code: 'FORBIDDEN' })
  }

  if (!tradie.isActive) {
    return reply.status(403).send({ error: 'Account inactive', code: 'INACTIVE' })
  }

  req.user = user
  req.tradie = tradie
}

export async function requireVerified(req: FastifyRequest, reply: FastifyReply) {
  if (!req.tradie.licenceVerified) {
    return reply.status(403).send({ error: 'Licence not verified', code: 'UNVERIFIED' })
  }
}

export async function requireABN(req: FastifyRequest, reply: FastifyReply) {
  if (!req.tradie.abnVerifiedAt) {
    return reply.status(403).send({ error: 'ABN not verified', code: 'ABN_REQUIRED' })
  }
}

export async function requireOnboarded(req: FastifyRequest, reply: FastifyReply) {
  if (!req.tradie.isOnboarded) {
    return reply.status(403).send({ error: 'Onboarding incomplete', code: 'ONBOARDING_INCOMPLETE' })
  }
}
