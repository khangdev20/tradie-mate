import { vi } from 'vitest'

/**
 * A drizzle-style query builder stub: every builder method returns the chain,
 * and awaiting it at any point resolves to `result`.
 */
export function queryChain<T>(result: T) {
  const chain: any = {}
  for (const method of [
    'from', 'where', 'limit', 'offset', 'orderBy', 'for',
    'set', 'values', 'returning', 'onConflictDoUpdate', 'onConflictDoNothing',
  ]) {
    chain[method] = vi.fn(() => chain)
  }
  chain.then = (resolve: (value: T) => unknown, reject?: (reason: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject)
  return chain
}
