/**
 * POST /api/airroi/search
 * Search AirROI for listings matching campaign criteria.
 * Returns listings for user review before import.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { searchListingsByMarket, searchListingsByRadius, AirROIFilter, AirROISort } from '@/lib/airroi/client'
import { mapAirROIListings } from '@/lib/airroi/mapper'
import { CampaignCriteria } from '@/lib/types/criteria'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.AIRROI_API_KEY) {
      return NextResponse.json(
        { error: 'AIRROI_API_KEY not configured. Add it to environment variables.' },
        { status: 503 }
      )
    }

    const body = await request.json()
    const {
      campaignId,
      // Market-level search
      country,
      region,
      locality,
      district,
      // Radius search (alternative)
      latitude,
      longitude,
      radius_miles,
      // Pagination
      page_size = 25,
      offset = 0,
    } = body as {
      campaignId: string
      country?: string
      region?: string
      locality?: string
      district?: string
      latitude?: number
      longitude?: number
      radius_miles?: number
      page_size?: number
      offset?: number
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })
    }

    const isRadiusSearch = latitude !== undefined && longitude !== undefined
    const isMarketSearch = country !== undefined || locality !== undefined

    if (!isRadiusSearch && !isMarketSearch) {
      return NextResponse.json(
        { error: 'Provide either (country/region/locality) for market search or (latitude/longitude) for radius search' },
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

    // Build AirROI filter from campaign criteria
    const filter: AirROIFilter = {}

    if (criteria.property.min_bedrooms > 0) {
      filter.bedrooms = { gte: criteria.property.min_bedrooms }
    }
    if (criteria.property.min_bathrooms > 0) {
      filter.baths = { gte: criteria.property.min_bathrooms }
    }
    if (criteria.property.min_guests > 0) {
      filter.guests = { gte: criteria.property.min_guests }
    }
    if (criteria.property.types.length > 0 && criteria.property.types[0] !== 'any') {
      filter.room_type = { eq: criteria.property.types[0] }
    }
    if (criteria.performance.nightly_rate_min > 0 || criteria.performance.nightly_rate_max > 0) {
      filter.ttm_avg_rate = {
        ...(criteria.performance.nightly_rate_min > 0 && { gte: criteria.performance.nightly_rate_min }),
        ...(criteria.performance.nightly_rate_max > 0 && { lte: criteria.performance.nightly_rate_max }),
      }
    }
    if (criteria.performance.min_rating > 0) {
      filter.rating_overall = { gte: criteria.performance.min_rating }
    }
    if (criteria.performance.min_reviews > 0) {
      filter.num_reviews = { gte: criteria.performance.min_reviews }
    }
    if (criteria.host.superhost_required) {
      filter.superhost = { eq: true }
    }
    if (criteria.property.required_amenities.length > 0) {
      filter.amenities = { all: criteria.property.required_amenities }
    }

    const sort: AirROISort = { ttm_revenue: 'desc', rating_overall: 'desc' }
    const pagination = { page_size: Math.min(page_size, 25), offset }

    let result
    if (isRadiusSearch) {
      result = await searchListingsByRadius({
        latitude: latitude!,
        longitude: longitude!,
        radius_miles: radius_miles ?? 5,
        filter,
        sort,
        pagination,
        currency: 'usd',
      })
    } else {
      result = await searchListingsByMarket({
        market: {
          country: country!,
          ...(region && { region }),
          ...(locality && { locality }),
          ...(district && { district }),
        },
        filter,
        sort,
        pagination,
        currency: 'usd',
      })
    }

    const listings = result.listings ?? []
    const mappedListings = mapAirROIListings(listings)

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: 'airroi_search',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: {
        search_type: isRadiusSearch ? 'radius' : 'market',
        results_count: mappedListings.length,
        market: isMarketSearch ? { country, region, locality, district } : null,
        coordinates: isRadiusSearch ? { latitude, longitude, radius_miles } : null,
      },
    })

    return NextResponse.json({
      listings: mappedListings,
      count: mappedListings.length,
      total: result.pagination?.total ?? mappedListings.length,
      campaign: { id: campaign.id, name: campaign.name },
    })
  } catch (error) {
    console.error('AirROI search error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
