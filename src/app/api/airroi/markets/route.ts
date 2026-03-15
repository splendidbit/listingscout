/**
 * GET /api/airroi/markets?query=Austin
 * Search for AirROI markets by name (typeahead).
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { searchMarkets } from '@/lib/airroi/client'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.AIRROI_API_KEY) {
      return NextResponse.json({ error: 'AIRROI_API_KEY not configured' }, { status: 503 })
    }

    const query = request.nextUrl.searchParams.get('query')
    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'query must be at least 2 characters' }, { status: 400 })
    }

    let result
    try {
      result = await searchMarkets(query)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('404')) return NextResponse.json({ markets: [] })
      throw err
    }
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Market search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
