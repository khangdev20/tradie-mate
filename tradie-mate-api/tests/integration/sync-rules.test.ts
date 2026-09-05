import { describe, it, expect } from 'vitest'
import { JobService } from '../../src/services/job.service'

/**
 * Integration-style tests for sync conflict rules without a live database.
 * Full HTTP integration tests require a running Postgres + Redis instance.
 */
describe('Sync UPDATE_STATUS rules', () => {
  it('rejects invalid offline status jumps', () => {
    expect(JobService.validateTransition('UPCOMING', 'COMPLETED')).toBe(false)
    expect(JobService.validateTransition('COMMUTING', 'COMPLETED')).toBe(false)
  })

  it('accepts valid commute workflow', () => {
    expect(JobService.validateTransition('UPCOMING', 'COMMUTING')).toBe(true)
    expect(JobService.validateTransition('COMMUTING', 'IN_PROGRESS')).toBe(true)
    expect(JobService.validateTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
  })
})
