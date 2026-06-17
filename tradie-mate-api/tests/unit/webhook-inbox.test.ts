import { describe, it, expect } from 'vitest'
import { WebhookSignatureVerifier } from '../../src/services/webhook-inbox.service'

describe('WebhookSignatureVerifier', () => {
  it('returns false for invalid stripe signatures', () => {
    const ok = WebhookSignatureVerifier.verifyStripe('{}', 'invalid', 'whsec_test')
    expect(ok).toBe(false)
  })
})
