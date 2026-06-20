import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('P0 onboarding high-priority regressions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('returns ONBOARDING_INCOMPLETE when tradie is not onboarded', async () => {
    const { requireOnboarded } = await import('../../src/middleware/auth.middleware')

    const send = vi.fn()
    const reply = {
      status: vi.fn().mockReturnValue({ send }),
    } as any

    await requireOnboarded(
      {
        tradie: { isOnboarded: false },
      } as any,
      reply,
    )

    expect(reply.status).toHaveBeenCalledWith(403)
    expect(send).toHaveBeenCalledWith({
      error: 'Onboarding incomplete',
      code: 'ONBOARDING_INCOMPLETE',
    })
  })

  it('only allows OTP mock fallback in development with exact phone+otp', async () => {
    vi.doMock('../../src/config/env', () => ({
      env: {
        NODE_ENV: 'development',
      },
    }))

    vi.doMock('../../src/utils/redis', () => ({
      redis: {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue(undefined),
        incr: vi.fn().mockResolvedValue(undefined),
      },
    }))

    vi.doMock('../../src/config/db', () => ({
      db: {
        select: vi.fn(() => ({
          from: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
            })),
          })),
        })),
      },
    }))

    vi.doMock('../../src/config/supabase', () => ({
      supabaseAdmin: {
        auth: {
          verifyOtp: vi.fn().mockResolvedValue({ data: null, error: { message: 'bad otp', status: 401 } }),
          signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
        },
      },
    }))

    const { verifyOtpHandler } = await import('../../src/routes/auth/handler')

    const makeReply = () => {
      const send = vi.fn()
      return {
        status: vi.fn().mockReturnValue({ send }),
        send,
      }
    }

    const okReply = makeReply()
    const ok = await verifyOtpHandler(
      { body: { phone: '+61412345678', otp: '123456' } } as any,
      okReply as any,
    )
    expect(ok).toMatchObject({
      access_token: 'mock-token-new',
      onboarding_status: 'PHONE_VERIFIED',
      is_new_user: true,
    })

    const badReply = makeReply()
    await verifyOtpHandler(
      { body: { phone: '+61499999999', otp: '123456' } } as any,
      badReply as any,
    )
    expect(badReply.status).toHaveBeenCalledWith(401)
    expect(badReply.send).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'OTP_INVALID' }),
    )
  })

  it('checks existing documents by tradie + doc_type key', async () => {
    const andMock = vi.fn(() => ({ op: 'and' }))
    const eqMock = vi.fn(() => ({ op: 'eq' }))

    vi.doMock('drizzle-orm', async (importOriginal) => {
      const actual = await importOriginal<typeof import('drizzle-orm')>()
      return {
        ...actual,
        and: andMock,
        eq: eqMock,
      }
    })

    vi.doMock('../../src/config/env', () => ({
      env: {
        AWS_S3_BUCKET: '',
        AWS_REGION: 'ap-southeast-2',
      },
    }))

    vi.doMock('../../src/services/onboarding.service', () => ({
      OnboardingService: {
        refreshDocumentStatus: vi.fn().mockResolvedValue(undefined),
      },
    }))

    const dbMock = {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn().mockResolvedValue([{ id: 'doc-1' }]),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
    }

    vi.doMock('../../src/config/db', () => ({
      db: dbMock,
    }))

    const { uploadDocumentHandler } = await import('../../src/routes/onboarding/handler')

    const reply = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    } as any

    const request = {
      tradie: { id: 'tradie-1' },
      file: vi.fn().mockResolvedValue({
        fields: {
          doc_type: { value: 'TRADE_LICENCE' },
        },
        mimetype: 'application/pdf',
        file: (async function* () {
          yield Buffer.from('pdf-data')
        })(),
      }),
    } as any

    await uploadDocumentHandler(request, reply)

    expect(andMock).toHaveBeenCalledTimes(1)
    expect(andMock.mock.calls[0]).toHaveLength(2)
    expect(eqMock.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(reply.status).toHaveBeenCalledWith(202)
  })
})
