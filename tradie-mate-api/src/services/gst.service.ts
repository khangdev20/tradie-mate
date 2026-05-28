/**
 * CRITICAL: All money in integer cents — never float
 * AU GST is 10%
 */
export class GSTService {
  private static readonly GST_RATE = 10 // 10% AU law — never change

  static calculateFromSubtotal(subtotalCents: number) {
    const gst = Math.round((subtotalCents * this.GST_RATE) / 100)
    return {
      subtotal: subtotalCents,
      gst,
      total: subtotalCents + gst,
    }
  }

  static calculateFromTotal(totalCents: number) {
    const gst = Math.round((totalCents * this.GST_RATE) / (100 + this.GST_RATE))
    return {
      subtotal: totalCents - gst,
      gst,
      total: totalCents,
    }
  }

  static toAUD(cents: number): string {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
    }).format(cents / 100)
  }
}
