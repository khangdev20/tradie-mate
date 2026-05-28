import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { buildApp } from '../../src/app'

describe('Standardized API Response Structure', () => {
  let app: any

  beforeAll(async () => {
    app = await buildApp()
  })

  afterAll(async () => {
    await app.close()
  })

  it('should wrap JSON 2xx responses in a success envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    })

    expect(response.statusCode).toBe(200)
    const json = JSON.parse(response.body)
    expect(json).toEqual({
      success: true,
      data: {
        status: 'ok',
        version: expect.any(String),
        uptime: expect.any(Number)
      }
    })
  })

  it('should wrap error responses in an error envelope', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/non-existent-route'
    })

    expect(response.statusCode).toBe(404)
    const json = JSON.parse(response.body)
    expect(json).toEqual({
      success: false,
      error: {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: expect.any(String)
      }
    })
  })
})
