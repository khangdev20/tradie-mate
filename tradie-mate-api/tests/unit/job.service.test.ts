import { describe, it, expect } from 'vitest'
import { JobService } from '../../src/services/job.service'

describe('JobService status transitions', () => {
  it('should allow valid transitions', () => {
    expect(JobService.validateTransition('UPCOMING', 'COMMUTING')).toBe(true)
    expect(JobService.validateTransition('COMMUTING', 'ARRIVED')).toBe(true)
    expect(JobService.validateTransition('ARRIVED', 'IN_PROGRESS')).toBe(true)
    expect(JobService.validateTransition('IN_PROGRESS', 'COMPLETED')).toBe(true)
    expect(JobService.validateTransition('COMPLETED', 'INVOICED')).toBe(true)
  })

  it('should allow cancel from active states', () => {
    expect(JobService.validateTransition('UPCOMING', 'CANCELLED')).toBe(true)
    expect(JobService.validateTransition('COMMUTING', 'CANCELLED')).toBe(true)
    expect(JobService.validateTransition('ARRIVED', 'CANCELLED')).toBe(true)
    expect(JobService.validateTransition('IN_PROGRESS', 'CANCELLED')).toBe(true)
  })

  it('should block invalid status transitions', () => {
    expect(JobService.validateTransition('UPCOMING', 'COMPLETED')).toBe(false)
    expect(JobService.validateTransition('COMMUTING', 'INVOICED')).toBe(false)
    expect(JobService.validateTransition('COMPLETED', 'UPCOMING')).toBe(false)
    expect(JobService.validateTransition('CANCELLED', 'UPCOMING')).toBe(false)
  })
})
