// src/utils/abn.ts
export function validateABN(abn: string): boolean {
  const cleanAbn = abn.replace(/\s/g, '')
  if (cleanAbn.length !== 11) return false

  const weights = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  let sum = 0

  for (let i = 0; i < 11; i++) {
    let digit = parseInt(cleanAbn[i], 10)
    if (i === 0) digit -= 1
    sum += digit * weights[i]
  }

  return sum % 89 === 0
}
