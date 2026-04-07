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
      return NextResponse.json({ error: 'Estimate service temporarily unavailable' }, { status: 503 })
    }

    const p = request.nextUrl.searchParams
    const address = p.get('address') ?? undefined
    const lat = p.get('lat') != null ? Number(p.get('lat')) : undefined
    const lng = p.get('lng') != null ? Number(p.get('lng')) : undefined
    const rawBedrooms = p.get('bedrooms')
    const rawBaths = p.get('baths')
    const rawGuests = p.get('guests')
    const clampPositive = (val: string | null, fallback: number, max: number) => {
      if (val == null || val === '') return fallback
      const n = Number(val)
      return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n), max) : fallback
    }
    const bedrooms = clampPositive(rawBedrooms, 2, 50)
    const baths = clampPositive(rawBaths, 1, 50)
    const guests = clampPositive(rawGuests, 4, 100)

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
    console.error('Estimate error:', error)
    return NextResponse.json({ error: 'Estimate failed' }, { status: 500 })
  }
}
