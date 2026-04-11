import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { registerHealthRoute } from '../src/routes/health.js'

describe('GET /health', () => {
  it('returns status ok with service name', async () => {
    const app = Fastify()
    await registerHealthRoute(app)
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('listingscout-worker')
    expect(typeof body.timestamp).toBe('string')

    await app.close()
  })
})
