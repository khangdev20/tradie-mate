import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/config/db', () => ({ db: {} }))
vi.mock('../../src/config/env', () => ({ env: { NODE_ENV: 'production' } }))
vi.mock('../../src/utils/redis', () => ({
  redis: { get: vi.fn(), set: vi.fn(), incr: vi.fn() },
}))
vi.mock('../../src/config/supabase', () => ({
  supabaseAdmin: { auth: { signInWithOtp: vi.fn() } },
}))

import { redis } from '../../src/utils/redis'
import { supabaseAdmin } from '../../src/config/supabase'
import { sendOtpHandler } from '../../src/routes/auth/handler'

function fakeReply() {
  const reply: any = { statusCode: 200, body: undefined }
  reply.status = vi.fn((code: number) => { reply.statusCode = code; return reply })
  reply.send = vi.fn((body: unknown) => { reply.body = body; return reply })
  return reply
}

const request = (phone: string) => ({ body: { phone } }) as any

describe('sendOtpHandler', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sends the first OTP and starts a 10-minute window', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null)
    vi.mocked(supabaseAdmin.auth.signInWithOtp).mockResolvedValueOnce({ error: null } as any)

    const result = await sendOtpHandler(request('+61412000111'), fakeReply())

    expect(result).toMatchObject({ message: 'OTP sent' })
    expect(redis.set).toHaveBeenCalledWith('otp_rate:+61412000111', '1', 'EX', 600)
  })

  it('counts later OTPs inside the window', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce('2')
    vi.mocked(supabaseAdmin.auth.signInWithOtp).mockResolvedValueOnce({ error: null } as any)

    await sendOtpHandler(request('+61412000111'), fakeReply())

    expect(redis.incr).toHaveBeenCalledWith('otp_rate:+61412000111')
  })

  it('blocks the 4th OTP within 10 minutes without calling Supabase', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce('3')
    const reply = fakeReply()

    await sendOtpHandler(request('+61412000111'), reply)

    expect(reply.statusCode).toBe(429)
    expect(reply.body.error.code).toBe('OTP_RATE_LIMIT')
    expect(supabaseAdmin.auth.signInWithOtp).not.toHaveBeenCalled()
  })

  it('does not count a failed send against the limit', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null)
    vi.mocked(supabaseAdmin.auth.signInWithOtp).mockResolvedValueOnce({
      error: { status: 400, message: 'Invalid phone' },
    } as any)
    const reply = fakeReply()

    await sendOtpHandler(request('+6100'), reply)

    expect(reply.statusCode).toBe(400)
    expect(redis.set).not.toHaveBeenCalled()
  })

  it('never uses the development test-phone shortcut in production', async () => {
    vi.mocked(redis.get).mockResolvedValueOnce(null)
    vi.mocked(supabaseAdmin.auth.signInWithOtp).mockResolvedValueOnce({ error: null } as any)

    const result = await sendOtpHandler(request('+61412345678'), fakeReply())

    expect(result).toMatchObject({ message: 'OTP sent' })
    expect(supabaseAdmin.auth.signInWithOtp).toHaveBeenCalledWith({ phone: '+61412345678' })
  })
})
