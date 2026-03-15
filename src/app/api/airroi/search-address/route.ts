/**
 * POST /api/airroi/search-address
 * Find comparable listings near an address via AirROI comparables endpoint.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { getComparableListings } from '@/lib/airroi/client'
import { AirROIListing, MarketSummaryResponse } from '@/lib/airroi/client'
import { scoreListing, ListingData } from '@/lib/scoring/engine'

function mapToEnriched(listing: AirROIListing, market: MarketSummaryResponse | null) {
  const li = listing.listing_info ?? {}
  const hi = listing.host_info ?? {}
  const loc = listing.location_info ?? {}
  const pd = listing.property_details ?? {}
  const bs = listing.booking_settings ?? {}
  const pi = listing.pricing_info ?? {}
  const rat = listing.ratings ?? {}
  const pm = listing.performance_metrics ?? {}

  const base = {
    listing_id: String(li.listing_id ?? Math.random()),
    listing_url: li.listing_url ?? `https://www.airbnb.com/rooms/${li.listing_id ?? ''}`,
    listing_title: li.listing_name ?? 'Untitled Listing',
    collection_source: 'airroi' as const,
    property_type: li.listing_type ?? 'Entire home',
    room_type: li.room_type ?? 'entire_home',
    bedrooms: pd.bedrooms ?? 0,
    bathrooms: pd.baths ?? pd.bathrooms ?? 0,
    max_guests: pd.guests ?? pd.accommodates ?? 0,
    amenities: pd.amenities ?? null,
    amenities_count: pd.amenities?.length ?? null,
    photo_count: li.photos_count ?? null,
    city: loc.locality ?? '',
    state: loc.region ?? '',
    country: loc.country ?? null,
    neighborhood: loc.district ?? null,
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    host_name: hi.host_name ?? null,
    host_id: hi.host_id ? String(hi.host_id) : null,
    host_listing_count: hi.host_listing_count ?? null,
    host_type: 'independent',
    superhost: hi.superhost ?? false,
    nightly_rate: pi.price_nightly ?? pi.nightly_rate ?? pm.ttm_avg_rate ?? null,
    ttm_avg_rate: pm.ttm_avg_rate ?? null,
    cleaning_fee: pi.cleaning_fee ?? null,
    minimum_stay: bs.min_nights ?? null,
    instant_book: bs.instant_book ?? null,
    avg_rating: rat.rating_overall ?? null,
    total_reviews: rat.num_reviews ?? rat.review_count ?? 0,
    occupancy_rate: pm.ttm_occupancy ?? null,
    annual_revenue: pm.ttm_revenue ?? null,
    ttm_revenue: pm.ttm_revenue ?? null,
    ttm_occupancy: pm.ttm_occupancy ?? null,
    l90d_revenue: pm.l90d_revenue ?? null,
    l90d_occupancy: pm.l90d_occupancy ?? null,
    l90d_avg_rate: pm.l90d_avg_rate ?? null,
    ttm_revpar: pm.ttm_revpar ?? null,
    l90d_revpar: pm.l90d_revpar ?? null,
    professional_management: hi.professional_management ?? false,
    rating_cleanliness: rat.rating_cleanliness ?? null,
    rating_accuracy: rat.rating_accuracy ?? null,
    rating_communication: rat.rating_communication ?? null,
    rating_location: rat.rating_location ?? null,
    rating_checkin: rat.rating_checkin ?? null,
    rating_value: rat.rating_value ?? null,
    market_avg_price: market?.average_daily_rate ?? null,
    market_avg_occupancy: market?.occupancy ?? null,
    market_avg_revenue: market?.revenue ?? null,
    cover_image_url: li.cover_photo_url ?? null,
    raw_data: listing as unknown as Record<string, unknown>,
  }

  const ld: ListingData = {
    listing_id: base.listing_id,
    listing_title: base.listing_title,
    city: base.city,
    state: base.state,
    bedrooms: base.bedrooms,
    bathrooms: base.bathrooms,
    max_guests: base.max_guests,
    room_type: base.room_type,
    amenities: base.amenities,
    amenities_count: base.amenities_count,
    photo_count: base.photo_count,
    nightly_rate: base.nightly_rate,
    ttm_avg_rate: base.ttm_avg_rate,
    avg_rating: base.avg_rating,
    total_reviews: base.total_reviews,
    occupancy_rate: base.occupancy_rate,
    ttm_occupancy: base.ttm_occupancy,
    annual_revenue: base.annual_revenue,
    ttm_revenue: base.ttm_revenue,
    host_listing_count: base.host_listing_count,
    superhost: base.superhost,
    rating_cleanliness: base.rating_cleanliness,
    rating_communication: base.rating_communication,
    market_avg_price: base.market_avg_price,
    market_avg_occupancy: base.market_avg_occupancy,
    market_avg_revenue: base.market_avg_revenue,
    l90d_revenue: base.l90d_revenue,
    ttm_revpar: base.ttm_revpar,
    l90d_revpar: base.l90d_revpar,
    l90d_avg_rate: base.l90d_avg_rate,
    professional_management: base.professional_management,
  }
  const scores = scoreListing(ld)
  return { ...base, ...scores }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!process.env.AIRROI_API_KEY) {
      return NextResponse.json({ error: 'AIRROI_API_KEY not configured' }, { status: 503 })
    }

    const { address } = await request.json() as { address: string; campaignId: string }
    if (!address) return NextResponse.json({ error: 'address is required' }, { status: 400 })

    const result = await getComparableListings({ address, bedrooms: 2, baths: 1, guests: 4, currency: 'usd' })
    const raw = (result as unknown as { listings?: AirROIListing[]; comparables?: AirROIListing[] }).listings
      ?? (result as unknown as { comparables?: AirROIListing[] }).comparables
      ?? []

    const listings = raw.map((l: AirROIListing) => mapToEnriched(l, null))
      .sort((a, b) => (b.opportunity_score ?? b.revenue_potential_score ?? 0) - (a.opportunity_score ?? a.revenue_potential_score ?? 0))

    return NextResponse.json({ listings, count: listings.length })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Search failed' }, { status: 500 })
  }
}
