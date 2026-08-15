import { describe, it, expect } from 'vitest'

describe('OTP rate limit error contract', () => {
  it('documents expected OTP_RATE_LIMIT envelope shape', () => {
    const envelope = {
      success: false,
      error: {
        statusCode: 429,
        code: 'OTP_RATE_LIMIT',
        message: 'Too many OTP requests. Please try again in 10 minutes.',
      },
    }

    expect(envelope.success).toBe(false)
    expect(envelope.error.code).toBe('OTP_RATE_LIMIT')
    expect(envelope.error.statusCode).toBe(429)
  })
})

describe('Subscription limit error contract', () => {
  it('documents SUBSCRIPTION_LIMIT_REACHED code', () => {
    const code = 'SUBSCRIPTION_LIMIT_REACHED'
    expect(code).toBe('SUBSCRIPTION_LIMIT_REACHED')
  })
})
