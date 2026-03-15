/**
 * GET /api/airroi/property?id=43036533
 * Fetch a single AirROI listing by Airbnb ID.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getListing } from '@/lib/airroi/client'
import { mapAirROIListing } from '@/lib/airroi/mapper'

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

    const idParam = request.nextUrl.searchParams.get('id')
    if (!idParam) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 })
    }

    let result
    try {
      result = await getListing(Number(idParam), 'usd')
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('404')) {
        return NextResponse.json({ error: 'Listing not found in AirROI. Try searching by address or market instead.' }, { status: 404 })
      }
      throw err
    }

    const mapped = mapAirROIListing(result.listing)
    return NextResponse.json({ listing: mapped, raw: result.listing })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
