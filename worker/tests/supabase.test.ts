import { describe, it, expect, beforeEach } from 'vitest'

describe('worker supabase client', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.INNGEST_EVENT_KEY = 'test'
    process.env.INNGEST_SIGNING_KEY = 'test'
  })

  it('creates a client singleton', async () => {
    const { getSupabase } = await import('../src/lib/supabase.js')
    const a = getSupabase()
    const b = getSupabase()
    expect(a).toBe(b)
  })
})
