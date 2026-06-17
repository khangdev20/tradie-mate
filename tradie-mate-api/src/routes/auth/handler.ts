import { FastifyReply, FastifyRequest } from 'fastify'
import { eq, and, sql } from 'drizzle-orm'
import { supabaseAdmin } from '../../config/supabase'
import { db } from '../../config/db'
import { tradies, tradieAuthMethods } from '../../db/schema/tradies'
import { redis } from '../../utils/redis'
import { env } from '../../config/env'

export const sendOtpHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { phone } = request.body as any

  // Rate limit: max 3 OTP requests per phone per 10 minutes
  const rateLimitKey = `otp_rate:${phone}`
  const count = await redis.get(rateLimitKey)

  if (count && parseInt(count) >= 3) {
    return reply.status(429).send({
      success: false,
      error: {
        statusCode: 429,
        code: 'OTP_RATE_LIMIT',
        message: 'Too many OTP requests. Please try again in 10 minutes.',
      },
    })
  }

  if (env.NODE_ENV === 'development' && phone === '+61412345678') {
    return { message: 'OTP sent (mocked)', expires_in: 60 }
  }

  let error: any = null
  try {
    const { error: err } = await supabaseAdmin.auth.signInWithOtp({ phone })
    error = err
  } catch (e: any) {
    error = e
  }

  if (error) {
    return reply.status(error.status || 400).send({ error: error.message })
  }

  // Increment rate limit count
  if (!count) {
    await redis.set(rateLimitKey, '1', 'EX', 600)
  } else {
    await redis.incr(rateLimitKey)
  }

  return { message: 'OTP sent', expires_in: 60 }
}

export const verifyOtpHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { phone, otp } = request.body as any

  let data: any = null
  let error: any = null
  try {
    const { data: d, error: err } = await supabaseAdmin.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms'
    })
    data = d
    error = err
  } catch (e: any) {
    error = e
  }

  console.error('DEBUG verifyOtp:', { env: env.NODE_ENV, phone, otp, isMatch: env.NODE_ENV === 'development' && phone === '+61412345678' && otp === '123456' })

  if (error || !data?.session) {
    if (env.NODE_ENV === 'development' && phone === '+61412345678' && otp === '123456') {
      const [tradie] = await db
        .select()
        .from(tradies)
        .where(eq(tradies.phone, phone))
        .limit(1)
      
      return {
        access_token: 'mock-token-dave',
        refresh_token: 'mock-refresh-token-dave',
        expires_in: 3600 * 24 * 365,
        tradie_id: tradie ? tradie.id : null,
        is_new_user: false
      }
    }
    return reply.status(error?.status || 401).send({ error: error?.message || 'Invalid OTP' })
  }

  const user = data.user!
  const session = data.session

  // Check if tradie exists in DB
  let [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, user.id))
    .limit(1)

  if (tradie) {
    // Update last used for this auth method
    await db.update(tradieAuthMethods)
      .set({ lastUsedAt: new Date() })
      .where(and(
        eq(tradieAuthMethods.tradieId, tradie.id),
        eq(tradieAuthMethods.provider, 'phone')
      ))
  }

  return {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: session.expires_in,
    tradie_id: tradie ? tradie.id : null,
    is_new_user: !tradie
  }
}

export const emailRegisterHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { email, password, first_name, last_name, trade_type } = request.body as any

  // 1. Create Supabase auth user
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // skip email confirmation for tradies
    user_metadata: { first_name, last_name, trade_type },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return reply.status(409).send({ error: 'Email already in use', code: 'EMAIL_EXISTS' })
    }
    return reply.status(error.status || 400).send({ error: error.message })
  }

  // 2. Create tradie record
  const [tradie] = await db.insert(tradies).values({
    authUserId:  data.user.id,
    firstName:   first_name,
    lastName:    last_name,
    email:       email,
    tradeType:   trade_type,
    hasPassword: true,
    isActive:    true,
    isOnboarded: false,
  }).returning()

  // 3. Record auth method
  await db.insert(tradieAuthMethods).values({
    tradieId:   tradie.id,
    provider:   'email',
    providerId: data.user.id,
    email:      email,
    isPrimary:  true,
  })

  // 4. Sign in to get session
  const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
    email, password,
  })

  if (signInError) throw signInError

  return reply.status(201).send({
    access_token:  sessionData.session!.access_token,
    refresh_token: sessionData.session!.refresh_token,
    expires_in:    sessionData.session!.expires_in,
    tradie_id:     tradie.id,
    is_new_user:   true,
  })
}

export const emailLoginHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { email, password } = request.body as any

  let data: any = null
  let error: any = null
  try {
    const { data: d, error: err } = await supabaseAdmin.auth.signInWithPassword({
      email, password,
    })
    data = d
    error = err
  } catch (e: any) {
    error = e
  }

  if (error || !data?.user) {
    if (env.NODE_ENV === 'development' && email === 'test@tradiemate.com' && password === 'Password123!') {
      const [tradie] = await db
        .select()
        .from(tradies)
        .where(eq(tradies.email, email))
        .limit(1)
      
      return {
        access_token:  'mock-token-dave',
        refresh_token: 'mock-refresh-token-dave',
        expires_in:    3600 * 24 * 365,
        tradie_id:     tradie ? tradie.id : null,
        is_new_user:   false,
      }
    }
    return reply.status(401).send({
      error: 'Invalid email or password',
      code: 'INVALID_CREDENTIALS',
    })
  }

  const [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, data.user.id))
    .limit(1)

  if (!tradie) {
    return reply.status(404).send({ error: 'Account not found', code: 'TRADIE_NOT_FOUND' })
  }

  await db.update(tradieAuthMethods)
    .set({ lastUsedAt: new Date() })
    .where(and(
      eq(tradieAuthMethods.tradieId, tradie.id),
      eq(tradieAuthMethods.provider, 'email'),
    ))

  return {
    access_token:  data.session!.access_token,
    refresh_token: data.session!.refresh_token,
    expires_in:    data.session!.expires_in,
    tradie_id:     tradie.id,
    is_new_user:   false,
  }
}

export const forgotPasswordHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { email } = request.body as any

  // Always return 200 — don't reveal if email exists
  await supabaseAdmin.auth.resetPasswordForEmail(email, {
    redirectTo: 'tradiemate://auth/reset-password',
  })

  return { message: 'If that email exists, a reset link has been sent' }
}

export const oauthCallbackHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { provider, id_token, full_name, email: providedEmail } = request.body as any

  const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
    provider,
    token: id_token,
  })

  if (error || !data.session) {
    return reply.status(error?.status || 400).send({ error: error?.message || 'OAuth failed' })
  }

  const userId = data.user.id
  const email = data.user.email || providedEmail

  let [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, userId))
    .limit(1)

  const isNewUser = !tradie

  if (isNewUser) {
    const metadata = data.user.user_metadata
    const nameToUse = full_name || metadata.full_name || metadata.name || 'Tradie'
    
    ;[tradie] = await db.insert(tradies).values({
      authUserId: userId,
      firstName:  nameToUse.split(' ')[0],
      lastName:   nameToUse.split(' ').slice(1).join(' '),
      email:      email ?? null,
      tradeType:  'OTHER', // updated on next screen
      isActive:   true,
      isOnboarded: false,
    }).returning()

    await db.insert(tradieAuthMethods).values({
      tradieId:   tradie.id,
      provider,
      providerId: userId,
      email,
      isPrimary:  true,
    })
  } else {
    await db.update(tradieAuthMethods)
      .set({ lastUsedAt: new Date() })
      .where(and(
        eq(tradieAuthMethods.tradieId, tradie.id),
        eq(tradieAuthMethods.provider, provider),
      ))
  }

  return {
    access_token:  data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in:    data.session.expires_in,
    tradie_id:     tradie.id,
    is_new_user:   isNewUser,
  }
}

export const linkProviderHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { provider } = request.params as any
  const { email, phone } = request.body as any
  const tradie = request.tradie!
  const user = request.user as any

  // Check if already linked
  const [existing] = await db
    .select()
    .from(tradieAuthMethods)
    .where(and(
      eq(tradieAuthMethods.tradieId, tradie.id),
      eq(tradieAuthMethods.provider, provider),
    ))
    .limit(1)

  if (existing) {
    return reply.status(409).send({ error: `${provider} already linked`, code: 'PROVIDER_ALREADY_LINKED' })
  }

  await db.insert(tradieAuthMethods).values({
    tradieId: tradie.id,
    provider,
    providerId: user.id,
    email: email || null,
    phone: phone || null,
    isPrimary: false,
  })

  // Update tradie table flags
  if (provider === 'email') await db.update(tradies).set({ email, hasPassword: true }).where(eq(tradies.id, tradie.id))
  if (provider === 'google') await db.update(tradies).set({ googleId: user.id }).where(eq(tradies.id, tradie.id))
  if (provider === 'apple') await db.update(tradies).set({ appleId: user.id }).where(eq(tradies.id, tradie.id))
  if (provider === 'phone') await db.update(tradies).set({ phone }).where(eq(tradies.id, tradie.id))

  return { message: `${provider} linked successfully` }
}

export const unlinkProviderHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { provider } = request.params as any
  const tradie = request.tradie!

  const methods = await db
    .select()
    .from(tradieAuthMethods)
    .where(eq(tradieAuthMethods.tradieId, tradie.id))

  if (methods.length <= 1) {
    return reply.status(400).send({ error: 'Cannot remove your only login method', code: 'LAST_AUTH_METHOD' })
  }

  await db.delete(tradieAuthMethods)
    .where(and(
      eq(tradieAuthMethods.tradieId, tradie.id),
      eq(tradieAuthMethods.provider, provider),
    ))

  return { message: `${provider} unlinked` }
}

export const getAuthMethodsHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const tradie = request.tradie!

  const methods = await db
    .select()
    .from(tradieAuthMethods)
    .where(eq(tradieAuthMethods.tradieId, tradie.id))

  return methods
}

export const refreshHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { refresh_token } = request.body as any

  const { data, error } = await supabaseAdmin.auth.refreshSession({ refresh_token })

  if (error || !data.session) {
    return reply.status(error?.status || 401).send({ error: error?.message || 'Invalid refresh token' })
  }

  return {
    access_token: data.session.access_token,
    expires_in: data.session.expires_in
  }
}

/**
 * POST /auth/sso
 * Module 2.3 — Google & Apple SSO Authentication
 * Validates an ID token from Google or Apple, then finds or creates a tradie account.
 */
export const ssoHandler = async (request: FastifyRequest<any>, reply: FastifyReply) => {
  const { provider, idToken } = request.body as { provider: 'GOOGLE' | 'APPLE'; idToken: string }

  if (!provider || !idToken) {
    return reply.status(400).send({ success: false, error: { message: 'provider and idToken are required.' } })
  }

  const supabaseProvider = provider === 'GOOGLE' ? 'google' : 'apple'

  // Validate the ID token via Supabase auth (which wraps Google/Apple public key verification)
  const { data, error } = await supabaseAdmin.auth.signInWithIdToken({
    provider: supabaseProvider as any,
    token: idToken,
  })

  if (error || !data.user || !data.session) {
    return reply.status(401).send({ success: false, error: { message: error?.message || 'SSO validation failed.' } })
  }

  const supabaseUser = data.user
  const email = supabaseUser.email
  const displayName = supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || ''
  const providerUserId = supabaseUser.id

  // Look for an existing tradie by auth user ID
  let [tradie] = await db
    .select()
    .from(tradies)
    .where(eq(tradies.authUserId, supabaseUser.id))
    .limit(1)

  if (!tradie && email) {
    // Look for existing tradie by email (account linking)
    const [byEmail] = await db
      .select()
      .from(tradies)
      .where(eq(tradies.email, email))
      .limit(1)
    tradie = byEmail
  }

  if (!tradie) {
    // Create new tradie record
    const nameParts = displayName.split(' ')
    const firstName = nameParts[0] || 'New'
    const lastName = nameParts.slice(1).join(' ') || 'Tradie'

    const [created] = await db
      .insert(tradies)
      .values({
        authUserId: supabaseUser.id,
        firstName,
        lastName,
        email: email || null,
        tradeType: 'OTHER',
        isOnboarded: false,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    tradie = created

    // Link auth method
    await db
      .insert(tradieAuthMethods)
      .values({
        tradieId: tradie.id,
        provider: supabaseProvider,
        providerId: providerUserId,
        email: email || null,
        isPrimary: true,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
  } else {
    // Link the new provider to the existing account if not already linked
    await db
      .insert(tradieAuthMethods)
      .values({
        tradieId: tradie.id,
        provider: supabaseProvider,
        providerId: providerUserId,
        email: email || null,
        isPrimary: false,
        createdAt: new Date(),
      })
      .onConflictDoNothing()

    // Update Google/Apple ID on tradie record
    if (provider === 'GOOGLE') {
      await db.update(tradies).set({ googleId: providerUserId, updatedAt: new Date() }).where(eq(tradies.id, tradie.id))
    } else {
      await db.update(tradies).set({ appleId: providerUserId, updatedAt: new Date() }).where(eq(tradies.id, tradie.id))
    }
  }

  return reply.status(200).send({
    success: true,
    data: {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: {
        id: tradie.id,
        fullName: `${tradie.firstName} ${tradie.lastName}`.trim(),
        phone: tradie.phone,
        email: tradie.email,
        isOnboarded: tradie.isOnboarded,
      },
    },
  })
}

export const logoutHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const authHeader = request.headers.authorization
  if (!authHeader) {
    return reply.status(401).send({ error: 'No authorization header' })
  }

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: verifyError } = await supabaseAdmin.auth.getUser(token)
  
  if (verifyError || !user) {
    return reply.status(401).send({ error: 'Invalid token' })
  }

  await supabaseAdmin.auth.admin.signOut(user.id)
  return { message: 'Logged out successfully' }
}
