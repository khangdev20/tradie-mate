import { env } from '../config/env'

export interface ABNDetails {
  abn: string
  entityName: string
  entityType: string
  gstRegistered: boolean
  active: boolean
}

export class ABNService {
  /**
   * Validates ABN using the Luhn-style check digit algorithm (AU specific)
   * ABN is 11 digits
   */
  static validateLuhn(abn: string): boolean {
    const cleanAbn = abn.replace(/\s/g, '')
    if (cleanAbn.length !== 11 || !/^\d+$/.test(cleanAbn)) return false

    const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
    const digits = cleanAbn.split('').map(Number)
    
    // Subtract 1 from the first digit
    digits[0] -= 1

    const sum = digits.reduce((acc, digit, idx) => acc + digit * weights[idx], 0)
    return sum % 89 === 0
  }

  /**
   * Lookup ABN details via ATO API
   */
  static async lookup(abn: string): Promise<ABNDetails | null> {
    if (!this.validateLuhn(abn)) return null

    const cleanAbn = abn.replace(/\s/g, '')
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleanAbn}&guid=${env.ATO_ABN_API_GUID}`

    try {
      const response = await fetch(url)
      const data = await response.json()

      // The ATO API returns JSONP-like callback usually, 
      // but if we handle it as plain JSON (some wrappers do this):
      if (data.Message) return null // Error message from ATO

      return {
        abn: data.Abn,
        entityName: data.EntityName,
        entityType: data.EntityTypeCode,
        gstRegistered: data.Gst?.length > 0,
        active: data.EntityStatusCode === 'ACT',
      }
    } catch (err) {
      console.error('ATO API Lookup failed', err)
      return null
    }
  }
}
