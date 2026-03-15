/**
 * GET /api/airdna/property?id=12345
 * Fetch a single AirDNA property by Airbnb ID.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getSingleProperty } from '@/lib/airdna/client'
import { mapAirDNAProperty } from '@/lib/airdna/mapper'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.AIRDNA_API_KEY) {
      return NextResponse.json({ error: 'AIRDNA_API_KEY not configured' }, { status: 503 })
    }

    const propertyId = request.nextUrl.searchParams.get('id')
    if (!propertyId) {
      return NextResponse.json({ error: 'id parameter is required' }, { status: 400 })
    }

    const result = await getSingleProperty(propertyId, {
      show_amenities: true,
      show_location: true,
      show_images: true,
    })

    const mapped = mapAirDNAProperty(result.property_details)

    return NextResponse.json({ listing: mapped, raw: result.property_details })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Lookup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
