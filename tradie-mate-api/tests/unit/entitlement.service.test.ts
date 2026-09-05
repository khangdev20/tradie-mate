import { describe, it, expect } from 'vitest'
import { EntitlementService } from '../../src/services/entitlement.service'

function collectChunks(chunk: unknown): unknown[] {
  const chunks: unknown[] = []

  const visit = (node: unknown): void => {
    if (node === null || typeof node !== 'object') return

    if (Array.isArray(node)) {
      node.forEach(visit)
      return
    }

    chunks.push(node)

    const queryChunks = (node as { queryChunks?: unknown[] }).queryChunks
    if (Array.isArray(queryChunks)) {
      queryChunks.forEach(visit)
    }
  }

  visit(chunk)
  return chunks
}

type ParamLike = {
  value: unknown
  encoder?: { mapToDriverValue?: (value: unknown) => unknown }
}

describe('EntitlementService.buildActiveOverrideCondition', () => {
  it('maps the comparison Date to a string driver parameter, never a Date object', () => {
    const condition = EntitlementService.buildActiveOverrideCondition(
      new Date('2026-01-01T00:00:00.000Z'),
    ) as unknown

    const chunks = collectChunks(condition)

    // A raw `sql` template interpolates a Date as a bare chunk, which
    // postgres-js rejects. A typed `gt(timestampCol, date)` wraps it in a Param
    // whose encoder maps the Date to an ISO string.
    const rawDates = chunks.filter((value) => value instanceof Date)
    expect(rawDates).toHaveLength(0)

    const mappedParams = chunks
      .filter(
        (value): value is ParamLike =>
          typeof value === 'object' &&
          value !== null &&
          'value' in value &&
          typeof value.encoder?.mapToDriverValue === 'function',
      )
      .map((param) => param.encoder!.mapToDriverValue!(param.value))

    expect(mappedParams.some((value) => typeof value === 'string')).toBe(true)
  })
})
