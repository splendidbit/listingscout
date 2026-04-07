/**
 * POST /api/airdna/search
 * Search AirDNA for listings matching campaign criteria.
 * Returns up to 25 listings for user review before import.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getCompList } from '@/lib/airdna/client'
import { mapAirDNAProperties } from '@/lib/airdna/mapper'
import { CampaignCriteria } from '@/lib/types/criteria'

function normalizeOccupancy(value: number | null): number | null {
  if (value === null) return null
  return value > 1 ? value / 100 : value
}

function matchesPropertyType(
  listing: ReturnType<typeof mapAirDNAProperties>[number],
  selectedTypes: string[]
): boolean {
  if (selectedTypes.length === 0) return true

  const roomType = listing.room_type.toLowerCase()
  const propertyType = listing.property_type.toLowerCase()

  return selectedTypes.some(type => {
    const normalized = type.toLowerCase()
    return roomType === normalized || propertyType.includes(normalized.replaceAll('_', ' '))
  })
}

function matchesAirDNACriteria(
  listing: ReturnType<typeof mapAirDNAProperties>[number],
  criteria: CampaignCriteria
): boolean {
  if (!matchesPropertyType(listing, criteria.property.types)) {
    return false
  }

  if (listing.bedrooms < criteria.property.min_bedrooms) return false
  if (listing.bathrooms < criteria.property.min_bathrooms) return false
  if (listing.max_guests < criteria.property.min_guests) return false

  if (criteria.property.required_amenities.length > 0) {
    const amenities = new Set((listing.amenities ?? []).map(amenity => amenity.toLowerCase()))
    const hasAllAmenities = criteria.property.required_amenities.every(amenity => amenities.has(amenity.toLowerCase()))
    if (!hasAllAmenities) return false
  }

  if (listing.total_reviews < criteria.performance.min_reviews) return false
  if (listing.avg_rating !== null && listing.avg_rating < criteria.performance.min_rating) return false

  const occupancyRate = normalizeOccupancy(listing.occupancy_rate)
  const minOccupancy = normalizeOccupancy(criteria.performance.min_occupancy_pct)
  if (occupancyRate !== null && minOccupancy !== null && occupancyRate < minOccupancy) return false

  if (
    listing.nightly_rate !== null &&
    criteria.performance.nightly_rate_max > 0 &&
    listing.nightly_rate > criteria.performance.nightly_rate_max
  ) {
    return false
  }

  if (criteria.host.superhost_required && !listing.superhost) return false

  return true
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.AIRDNA_API_KEY) {
      return NextResponse.json(
        { error: 'AirDNA search is temporarily unavailable' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const { campaignId, city_id, region_id, limit = 25 } = body as {
      campaignId: string
      city_id?: number
      region_id?: number
      limit?: number
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    if (!city_id && !region_id) {
      return NextResponse.json(
        { error: 'city_id or region_id is required. Use /api/airdna/markets to find them.' },
        { status: 400 }
      )
    }

    // Get campaign criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id, name, criteria')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const criteria = campaign.criteria as CampaignCriteria

    // Build AirDNA query from campaign criteria
    const airdnaParams: Parameters<typeof getCompList>[0] = {
      city_id,
      region_id,
      bedrooms: criteria.property.min_bedrooms > 0 ? criteria.property.min_bedrooms : undefined,
      accommodates: criteria.property.min_guests > 0 ? criteria.property.min_guests : undefined,
      adr_min: criteria.performance.nightly_rate_min > 0 ? criteria.performance.nightly_rate_min : undefined,
      adr_max: criteria.performance.nightly_rate_max > 0 ? criteria.performance.nightly_rate_max : undefined,
      room_types: criteria.property.types.includes('private_room') ? 'private_room' : 'entire_home',
      order: 'revenue',
      desc: true,
      limit: Math.max(1, Math.min(Number(limit) || 25, 25)),
      show_amenities: true,
      show_location: true,
      currency: 'usd',
    }

    const result = await getCompList(airdnaParams)

    if (!result.properties || result.properties.length === 0) {
      return NextResponse.json({
        listings: [],
        count: 0,
        message: 'No listings found for these criteria. Try broadening your filters.',
        campaign: { id: campaign.id, name: campaign.name },
      })
    }

    const mappedListings = mapAirDNAProperties(result.properties)
      .filter(listing => matchesAirDNACriteria(listing, criteria))

    // Log the search in audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: 'airdna_search',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: {
        city_id,
        region_id,
        results_count: mappedListings.length,
        params: airdnaParams,
      },
    })

    return NextResponse.json({
      listings: mappedListings,
      count: mappedListings.length,
      area_info: result.area_info,
      campaign: { id: campaign.id, name: campaign.name },
    })
  } catch (error) {
    console.error('AirDNA search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
