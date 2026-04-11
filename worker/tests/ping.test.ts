import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ping function', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.INNGEST_EVENT_KEY = 'test'
    process.env.INNGEST_SIGNING_KEY = 'test'
    vi.resetModules()
  })

  it('writes a crawl_runs row with status ping_ok for the given metro', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: [{ id: 'crawl-1' }], error: null })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })

    vi.doMock('../src/lib/supabase.js', () => ({
      getSupabase: () => ({ from: fromMock }),
    }))

    const { runPing } = await import('../src/inngest/functions/ping.js')

    const result = await runPing({
      metroId: 'metro-123',
      userId: 'user-456',
    })

    expect(fromMock).toHaveBeenCalledWith('crawl_runs')
    expect(insertMock).toHaveBeenCalledWith({
      metro_id: 'metro-123',
      status: 'ping_ok',
      started_at: expect.any(String),
      finished_at: expect.any(String),
      listings_discovered: 0,
      listings_updated: 0,
      listings_errored: 0,
    })
    expect(result.ok).toBe(true)
  })

  it('returns ok: false when the insert errors', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })

    vi.doMock('../src/lib/supabase.js', () => ({
      getSupabase: () => ({ from: fromMock }),
    }))

    const { runPing } = await import('../src/inngest/functions/ping.js')

    const result = await runPing({ metroId: 'metro-123', userId: 'user-456' })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('boom')
  })
})
