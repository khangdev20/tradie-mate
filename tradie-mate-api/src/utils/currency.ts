/**
 * CRITICAL: All money in integer cents — never float
 * Use this utility to avoid floating point errors in AUD
 */
export const formatAUD = (cents: number): string => {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export const toCents = (dollars: number | string): number => {
  const d = typeof dollars === 'string' ? parseFloat(dollars) : dollars
  return Math.round(d * 100)
}

export const fromCents = (cents: number): number => {
  return cents / 100
}
