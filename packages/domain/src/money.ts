/** All monetary values in integer cents — never floats. */
export type Cents = number

export function formatAUD(cents: Cents): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(cents / 100)
}

export function centsFromDollars(dollars: number): Cents {
  return Math.round(dollars * 100)
}
