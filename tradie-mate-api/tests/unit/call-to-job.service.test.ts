import { describe, it, expect, vi, beforeEach } from 'vitest'
import { queryChain } from '../helpers/query-chain'

vi.mock('../../src/config/db', () => ({
  db: { select: vi.fn(), insert: vi.fn(), update: vi.fn() },
}))
vi.mock('../../src/config/env', () => ({ env: { OPENAI_API_KEY: '' } }))
vi.mock('../../src/services/notification.service', () => ({
  NotificationService: { notifyTradie: vi.fn() },
}))

import { db } from '../../src/config/db'
import { NotificationService } from '../../src/services/notification.service'
import { CallToJobService, normaliseExtraction } from '../../src/services/call-to-job.service'

describe('normaliseExtraction', () => {
  it('keeps valid fields and falls back for missing ones', () => {
    const result = normaliseExtraction(
      { customerName: ' Sam ', jobDescription: 'Burst pipe', urgency: 'EMERGENCY', confidence: 90 },
      'raw transcript',
      '+61400000000',
    )
    expect(result).toMatchObject({
      customerName: 'Sam',
      customerPhone: '+61400000000',
      jobDescription: 'Burst pipe',
      urgency: 'EMERGENCY',
      confidence: 90,
    })
  })

  it('rejects an unknown urgency and a non-object answer', () => {
    expect(normaliseExtraction({ urgency: 'ASAP' }, 't', '').urgency).toBe('FLEXIBLE')
    expect(normaliseExtraction('nope', 'raw', '').jobDescription).toBe('raw')
  })
})

describe('CallToJobService.createDraftJobFromCall', () => {
  beforeEach(() => vi.clearAllMocks())

  const call = {
    tradieId: 'tradie-1',
    callSid: 'CA123',
    from: '+61400000000',
    to: '+61700000000',
    transcript: 'Hi, my hot water system is leaking in Paddington',
  }

  it('creates a DRAFT job and notifies the tradie', async () => {
    vi.mocked(db.select).mockReturnValueOnce(queryChain([]) as any) // no existing call log
    vi.mocked(db.insert)
      .mockReturnValueOnce(queryChain([{ id: 'log-1' }]) as any)
      .mockReturnValueOnce(queryChain([{ id: 'job-1' }]) as any)
    vi.mocked(db.update).mockReturnValue(queryChain(undefined) as any)

    const result = await CallToJobService.createDraftJobFromCall(call)

    expect(result).toEqual({ jobId: 'job-1', created: true })
    const jobValues = vi.mocked(db.insert).mock.results[1].value.values.mock.calls[0][0]
    expect(jobValues).toMatchObject({ status: 'DRAFT', source: 'PHONE_CALL', tradieId: 'tradie-1', callLogId: 'log-1' })
    expect(NotificationService.notifyTradie).toHaveBeenCalledWith('tradie-1', expect.objectContaining({
      type: 'CALL_JOB_CREATED',
      data: expect.objectContaining({ jobId: 'job-1' }),
    }))
  })

  it('is idempotent: a replayed call that already produced a job creates nothing', async () => {
    vi.mocked(db.select).mockReturnValueOnce(queryChain([{ id: 'log-1', jobCreated: true, jobId: 'job-1' }]) as any)

    const result = await CallToJobService.createDraftJobFromCall(call)

    expect(result).toEqual({ jobId: 'job-1', created: false })
    expect(db.insert).not.toHaveBeenCalled()
    expect(NotificationService.notifyTradie).not.toHaveBeenCalled()
  })

  it('only logs calls without a transcript', async () => {
    vi.mocked(db.select).mockReturnValueOnce(queryChain([]) as any)
    vi.mocked(db.insert).mockReturnValueOnce(queryChain([{ id: 'log-1' }]) as any)

    const result = await CallToJobService.createDraftJobFromCall({ ...call, transcript: '  ' })

    expect(result.created).toBe(false)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })
})

describe('CallToJobService.processVapiCall', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when no tradie owns the assistant or number', async () => {
    vi.mocked(db.select)
      .mockReturnValueOnce(queryChain([]) as any) // assistant lookup
      .mockReturnValueOnce(queryChain([]) as any) // number lookup

    const result = await CallToJobService.processVapiCall({
      callId: 'call-1',
      transcript: 'Need a sparky',
      callerNumber: '+61400000000',
      tradieNumber: '+61700000000',
      assistantId: 'asst-1',
    })

    expect(result).toEqual({ jobId: null, created: false })
    expect(db.insert).not.toHaveBeenCalled()
  })
})
