import { describe, it, expect } from 'vitest'
import { JobService } from '../../src/services/job.service'

describe('JobService.normalizeStatus', () => {
  it('maps PENDING alias to UPCOMING', () => {
    expect(JobService.normalizeStatus('PENDING')).toBe('UPCOMING')
    expect(JobService.normalizeStatus('UPCOMING')).toBe('UPCOMING')
  })
})

describe('JobService status transitions with aliases', () => {
  it('allows COMMUTING from UPCOMING after normalization', () => {
    expect(JobService.validateTransition('UPCOMING', 'COMMUTING')).toBe(true)
    expect(JobService.validateTransition(JobService.normalizeStatus('PENDING'), 'COMMUTING')).toBe(true)
  })
})
