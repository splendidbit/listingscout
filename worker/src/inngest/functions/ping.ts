import { inngest } from '../client.js'
import { getSupabase } from '../../lib/supabase.js'

export interface PingInput {
  metroId: string
  userId: string
}

export type PingResult =
  | { ok: true; crawlRunId?: string }
  | { ok: false; error: string }

// Pure business logic, separated from the Inngest function wrapper
// so it can be unit-tested without spinning up Inngest machinery.
export async function runPing(input: PingInput): Promise<PingResult> {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { error } = await supabase.from('crawl_runs').insert({
    metro_id: input.metroId,
    status: 'ping_ok',
    started_at: now,
    finished_at: now,
    listings_discovered: 0,
    listings_updated: 0,
    listings_errored: 0,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// Inngest function registration (v4 API: triggers belong inside the first argument)
export const pingFunction = inngest.createFunction(
  {
    id: 'metros-ping',
    triggers: [{ event: 'metros/ping.requested' }],
  },
  async ({ event, step }) => {
    const result = await step.run('write-crawl-run', () =>
      runPing({
        metroId: event.data.metroId,
        userId: event.data.userId,
      })
    )

    if (!result.ok) {
      throw new Error(`ping failed: ${result.error}`)
    }

    return result
  }
)
