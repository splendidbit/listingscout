/**
 * GET /api/airroi/estimate?address=...&bedrooms=2&baths=2&guests=4
 * Revenue estimate for a property via AirROI calculator.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getRevenueEstimate } from '@/lib/airroi/client'

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

    const p = request.nextUrl.searchParams
    const address = p.get('address') ?? undefined
    const lat = p.get('lat') ? Number(p.get('lat')) : undefined
    const lng = p.get('lng') ? Number(p.get('lng')) : undefined
    const bedrooms = Number(p.get('bedrooms') ?? 2)
    const baths = Number(p.get('baths') ?? 1)
    const guests = Number(p.get('guests') ?? 4)

    if (!address && (lat === undefined || lng === undefined)) {
      return NextResponse.json({ error: 'Provide address or lat/lng' }, { status: 400 })
    }

    const result = await getRevenueEstimate({
      ...(address ? { address } : { lat, lng }),
      bedrooms,
      baths,
      guests,
      currency: 'usd',
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Estimate failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
