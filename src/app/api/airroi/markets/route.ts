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
      return NextResponse.json({ error: 'Market search temporarily unavailable' }, { status: 503 })
    }

    const query = request.nextUrl.searchParams.get('query')
    if (!query || query.length < 2 || query.length > 255) {
      return NextResponse.json({ error: 'query must be 2-255 characters' }, { status: 400 })
    }

    let result
    try {
      result = await searchMarkets(query)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      console.error('[AirROI markets] searchMarkets threw:', msg)
      if (msg.includes('404')) return NextResponse.json({ markets: [] })
      throw err
    }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[AirROI markets] route error:', error)
    return NextResponse.json({ error: 'Market search failed' }, { status: 500 })
  }
}
