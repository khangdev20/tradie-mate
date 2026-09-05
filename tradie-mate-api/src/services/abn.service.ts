import { env } from '../config/env'
import { redis } from '../utils/redis'

export interface ABNDetails {
  abn: string
  entityName: string
  entityType: string
  gstRegistered: boolean
  active: boolean
}

const ABN_CACHE_TTL = 60 * 60 * 24 // 24 hours

export class ABNService {
  /**
   * Validates ABN using the Luhn-style check digit algorithm (AU specific).
   * ABN is 11 digits.
   */
  static validateLuhn(abn: string): boolean {
    const cleanAbn = abn.replace(/[\s-]/g, '')
    if (cleanAbn.length !== 11 || !/^\d+$/.test(cleanAbn)) return false

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    const digits = cleanAbn.split('').map(Number)

    // Subtract 1 from the first digit
    digits[0] -= 1

    const sum = digits.reduce((acc, digit, idx) => acc + digit * weights[idx], 0)
    return sum % 89 === 0
  }

  /**
   * Strips all non-digit characters from ABN string.
   */
  static clean(abn: string): string {
    return abn.replace(/[\s-]/g, '')
  }

  /**
   * Lookup ABN details via ATO ABR API with Redis caching (24h).
   * Returns null if lookup fails (treat as ABR unavailable).
   * Sets `active: false` if entity is cancelled/inactive.
   */
  static async lookup(abn: string): Promise<ABNDetails | null> {
    const cleanAbn = this.clean(abn)
    if (!this.validateLuhn(cleanAbn)) return null

    const cacheKey = `abr_check:${cleanAbn}`

    // Check Redis cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return JSON.parse(cached) as ABNDetails
      }
    } catch (_) {
      // Cache miss or Redis unavailable — continue to live lookup
    }

    // Dev mock: return fake active entity
    if (env.NODE_ENV === 'development') {
      const mock: ABNDetails = {
        abn: cleanAbn,
        entityName: 'DEMO TRADIE PTY LTD',
        entityType: 'PRV',
        gstRegistered: true,
        active: true,
      }
      await redis.set(cacheKey, JSON.stringify(mock), 'EX', ABN_CACHE_TTL).catch(() => {})
      return mock
    }

    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanAbn}&guid=${env.ATO_ABN_API_GUID}`

    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!response.ok) return null

      const raw = await response.text()
      // ABR returns JSONP: callback({ ... }); — strip wrapper
      const jsonStr = raw.replace(/^.*?\(/, '').replace(/\);?\s*$/, '')
      const data = JSON.parse(jsonStr)

      if (data.Message) return null // Error message from ATO

      const result: ABNDetails = {
        abn: data.Abn ?? cleanAbn,
        entityName: data.EntityName ?? data.MainName?.FullName ?? '',
        entityType: data.EntityTypeCode ?? '',
        gstRegistered: !!(data.Gst && data.Gst.length > 0),
        active: data.EntityStatusCode === 'ACT',
      }

      // Cache the result
      await redis.set(cacheKey, JSON.stringify(result), 'EX', ABN_CACHE_TTL).catch(() => {})

      return result
    } catch (err) {
      console.error('[ABNService] ATO API lookup failed', err)
      return null
    }
  }
}
