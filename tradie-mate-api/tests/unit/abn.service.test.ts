import { describe, it, expect } from 'vitest'
import { ABNService } from '../../src/services/abn.service'

describe('ABNService Luhn Algorithm', () => {
  it('should validate a correct ABN (ATO ABN: 51 824 753 556)', () => {
    expect(ABNService.validateLuhn('51 824 753 556')).toBe(true)
    expect(ABNService.validateLuhn('51824753556')).toBe(true)
  })

  it('should reject an incorrect ABN', () => {
    expect(ABNService.validateLuhn('51 824 753 557')).toBe(false)
    expect(ABNService.validateLuhn('12345678901')).toBe(false)
  })

  it('should reject short or malformed inputs', () => {
    expect(ABNService.validateLuhn('123')).toBe(false)
    expect(ABNService.validateLuhn('5182475355a')).toBe(false)
  })
})
