/**
 * POST /api/airroi/search
 * Search AirROI for listings matching campaign criteria.
 * Returns enriched listings with scoring pre-calculated.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  searchListingsByMarket,
  searchListingsByRadius,
  getMarketSummary,
  AirROIFilter,
  AirROISort,
  AirROIListing,
  MarketSummaryResponse,
} from '@/lib/airroi/client'
import { scoreListing, ListingData } from '@/lib/scoring/engine'
import { analyzeListingWithAI, isAnalysisFresh } from '@/lib/ai/listing-analyzer'
import { CampaignCriteria } from '@/lib/types/criteria'

export interface EnrichedListing {
  listing_id: string
  listing_url: string
  listing_title: string
  collection_source: 'airroi'
  property_type: string
  room_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  amenities: string[] | null
  amenities_count: number | null
  photo_count: number | null
  city: string
  state: string
  country: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  host_name: string | null
  host_id: string | null
  host_listing_count: number | null
  host_type: string
  superhost: boolean
  nightly_rate: number | null
  ttm_avg_rate: number | null
  cleaning_fee: number | null
  minimum_stay: number | null
  instant_book: boolean | null
  avg_rating: number | null
  total_reviews: number
  occupancy_rate: number | null
  annual_revenue: number | null
  ttm_revenue: number | null
  ttm_occupancy: number | null
  l90d_revenue: number | null
  l90d_occupancy: number | null
  rating_cleanliness: number | null
  rating_accuracy: number | null
  rating_communication: number | null
  rating_location: number | null
  rating_checkin: number | null
  rating_value: number | null
  market_avg_price: number | null
  market_avg_occupancy: number | null
  market_avg_revenue: number | null
  revenue_potential_score: number
  pricing_opportunity_score: number
  listing_quality_score: number
  review_momentum_score: number
  competition_pressure_score: number
  lead_tier: string
  ai_lead_score: number | null
  ai_bucket: string
  opportunity_notes: string | null
  outreach_angle: string | null
  ai_confidence: number | null
  ai_analyzed_at: string | null
  cover_image_url: string | null
  raw_data: Record<string, unknown>
}

function mapAirROIToEnriched(
  listing: AirROIListing,
  market: MarketSummaryResponse | null
): EnrichedListing {
  // Destructure nested objects
  const li = listing.listing_info ?? {}
  const hi = listing.host_info ?? {}
  const loc = listing.location_info ?? {}
  const pd = listing.property_details ?? {}
  const bs = listing.booking_settings ?? {}
  const pi = listing.pricing_info ?? {}
  const rat = listing.ratings ?? {}
  const pm = listing.performance_metrics ?? {}

  const listingId = String(li.listing_id ?? Math.random())
  const listingUrl = li.listing_url ?? `https://www.airbnb.com/rooms/${li.listing_id ?? ''}`

  return {
    listing_id: listingId,
    listing_url: listingUrl,
    listing_title: li.listing_name ?? 'Untitled Listing',
    collection_source: 'airroi',

    property_type: li.listing_type ?? li.room_type ?? 'Entire home',
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
    host_type: 'diy', // overwritten by scoring
    superhost: hi.superhost ?? false,

    nightly_rate: pi.price_nightly ?? pi.nightly_rate ?? pm.ttm_avg_rate ?? null,
    ttm_avg_rate: pm.ttm_avg_rate ?? null,
    cleaning_fee: pi.cleaning_fee ?? null,
    minimum_stay: bs.min_nights ?? bs.minimum_nights ?? null,
    instant_book: bs.instant_book ?? null,

    avg_rating: rat.rating_overall ?? null,
    total_reviews: rat.num_reviews ?? rat.review_count ?? 0,
    occupancy_rate: pm.ttm_occupancy ?? null,
    annual_revenue: pm.ttm_revenue ?? null,
    ttm_revenue: pm.ttm_revenue ?? null,
    ttm_occupancy: pm.ttm_occupancy ?? null,
    l90d_revenue: pm.l90d_revenue ?? null,
    l90d_occupancy: pm.l90d_occupancy ?? null,

    rating_cleanliness: rat.rating_cleanliness ?? null,
    rating_accuracy: rat.rating_accuracy ?? null,
    rating_communication: rat.rating_communication ?? null,
    rating_location: rat.rating_location ?? null,
    rating_checkin: rat.rating_checkin ?? null,
    rating_value: rat.rating_value ?? null,

    market_avg_price: market?.average_daily_rate ?? null,
    market_avg_occupancy: market?.occupancy ?? null,
    market_avg_revenue: market?.revenue ?? null,

    revenue_potential_score: 0,
    pricing_opportunity_score: 0,
    listing_quality_score: 0,
    review_momentum_score: 0,
    competition_pressure_score: 0,
    lead_tier: 'weak',

    ai_lead_score: null,
    ai_bucket: 'weak_lead',
    opportunity_notes: null,
    outreach_angle: null,
    ai_confidence: null,
    ai_analyzed_at: null,

    cover_image_url: li.cover_photo_url ?? null,
    raw_data: listing as unknown as Record<string, unknown>,
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.AIRROI_API_KEY) {
      return NextResponse.json({ error: 'AIRROI_API_KEY not configured.' }, { status: 503 })
    }

    const body = await request.json()
    const {
      campaignId,
      country,
      region,
      locality,
      district,
      latitude,
      longitude,
      radius_miles,
      page_size = 10,
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

    if (!campaignId) return NextResponse.json({ error: 'campaignId is required' }, { status: 400 })

    const isRadiusSearch = latitude !== undefined && longitude !== undefined
    const isMarketSearch = country !== undefined || locality !== undefined

    if (!isRadiusSearch && !isMarketSearch) {
      return NextResponse.json({ error: 'Provide market or coordinates' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id, name, criteria')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

    const criteria = campaign.criteria as CampaignCriteria

    // Minimal filter — let scoring engine rank
    const filter: AirROIFilter = {}
    if (criteria.host.superhost_required) filter.superhost = { eq: true }
    const VALID_AIRROI_AMENITIES = new Set(['wifi','pool','hot_tub','dedicated_workspace','kitchen','washer','dryer','free_parking_on_premises','air_conditioning','heating','indoor_fireplace','gym','ev_charger','pets_allowed','bbq_grill','patio_or_balcony','beach_access','waterfront','ski_in_ski_out','lake_access','sauna','fire_pit','bathtub','bikes','dishwasher','iron','refrigerator','tv','coffee_maker','microwave','oven','stove','private_entrance','luggage_dropoff_allowed'])
    const validAmenities = criteria.property.required_amenities.filter(a => VALID_AIRROI_AMENITIES.has(a))
    if (validAmenities.length > 0) filter.amenities = { all: validAmenities }

    // Sort ascending by revenue to surface underperformers — hosts leaving money on the table
    const sort: AirROISort = { ttm_revenue: 'asc', ttm_occupancy: 'asc' }
    const pagination = { page_size: Math.min(page_size, 10), offset }

    const marketParams = isMarketSearch
      ? { country: country!, ...(region && { region }), ...(locality && { locality }), ...(district && { district }) }
      : null

    const [result, marketSummary] = await Promise.allSettled([
      isRadiusSearch
        ? searchListingsByRadius({ latitude: latitude!, longitude: longitude!, radius_miles: radius_miles ?? 5, filter, sort, pagination, currency: 'usd' })
        : searchListingsByMarket({ market: marketParams, filter, sort, pagination, currency: 'usd' }),
      marketParams
        ? getMarketSummary({ market: marketParams, currency: 'usd' })
        : Promise.resolve(null),
    ])

    if (result.status === 'rejected') {
      console.error('AirROI search error:', result.reason)
      throw new Error(result.reason instanceof Error ? result.reason.message : 'AirROI search failed')
    }

    const market = marketSummary.status === 'fulfilled' ? marketSummary.value : null
    const rawListings = result.value.listings ?? []

    console.log(`AirROI returned ${rawListings.length} raw listings`)
    if (rawListings.length > 0) {
      console.log('First listing keys:', Object.keys(rawListings[0]))
    }

    // Map nested AirROI response → flat EnrichedListing
    let listings = rawListings.map((l: AirROIListing) => mapAirROIToEnriched(l, market))

    // Filter out professional operators (10+ listings)
    listings = listings.filter(l => l.host_listing_count === null || l.host_listing_count <= 9)

    // Filter out already-optimized listings (high revenue + high rating = not a consulting target)
    // Keep listings where EITHER revenue is low OR rating is below 4.8
    listings = listings.filter(l => {
      const highRevenue = l.ttm_revenue !== null && l.ttm_revenue > 100000
      const highRating = l.avg_rating !== null && l.avg_rating >= 4.9
      return !(highRevenue && highRating) // exclude only if BOTH are excellent
    })

    // Score every listing
    listings = listings.map(l => {
      const listingData: ListingData = {
        listing_id: l.listing_id,
        listing_title: l.listing_title,
        city: l.city,
        state: l.state,
        bedrooms: l.bedrooms,
        bathrooms: l.bathrooms,
        max_guests: l.max_guests,
        room_type: l.room_type,
        amenities: l.amenities,
        amenities_count: l.amenities_count,
        photo_count: l.photo_count,
        nightly_rate: l.nightly_rate,
        ttm_avg_rate: l.ttm_avg_rate,
        avg_rating: l.avg_rating,
        total_reviews: l.total_reviews,
        occupancy_rate: l.occupancy_rate,
        ttm_occupancy: l.ttm_occupancy,
        annual_revenue: l.annual_revenue,
        ttm_revenue: l.ttm_revenue,
        host_listing_count: l.host_listing_count,
        superhost: l.superhost,
        rating_cleanliness: l.rating_cleanliness,
        rating_communication: l.rating_communication,
        market_avg_price: l.market_avg_price,
        market_avg_occupancy: l.market_avg_occupancy,
        market_avg_revenue: l.market_avg_revenue,
      }
      const scores = scoreListing(listingData)
      return { ...l, ...scores }
    })

    // AI analysis on score >= 40 listings
    if (process.env.OPENAI_API_KEY) {
      const marketData = {
        average_daily_rate: market?.average_daily_rate ?? null,
        occupancy: market?.occupancy ?? null,
        revenue: market?.revenue ?? null,
        active_listings_count: market?.active_listings_count ?? null,
      }

      const analysisPromises = listings
        .filter(l => l.revenue_potential_score >= 40 && !isAnalysisFresh(l.ai_analyzed_at))
        .map(async l => {
          try {
            const analysis = await analyzeListingWithAI(l as unknown as ListingData, marketData)
            return { listing_id: l.listing_id, analysis }
          } catch {
            return null
          }
        })

      const analysisResults = await Promise.all(analysisPromises)
      const analysisMap = new Map(analysisResults.filter(Boolean).map(r => [r!.listing_id, r!.analysis]))

      listings = listings.map(l => {
        const analysis = analysisMap.get(l.listing_id)
        if (!analysis) return l
        return {
          ...l,
          ai_lead_score: analysis.ai_lead_score ?? null,
          ai_bucket: analysis.ai_bucket ?? l.ai_bucket,
          opportunity_notes: analysis.opportunity_notes ?? null,
          outreach_angle: analysis.outreach_angle ?? null,
          ai_confidence: analysis.confidence ?? null,
          ai_analyzed_at: new Date().toISOString(),
        }
      })
    }

    // Sort by revenue_potential_score desc
    listings.sort((a, b) => b.revenue_potential_score - a.revenue_potential_score)

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: 'airroi_search',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: { results_count: listings.length, market: marketParams },
    })

    return NextResponse.json({
      listings,
      count: listings.length,
      market_summary: market,
      campaign: { id: campaign.id, name: campaign.name },
    })
  } catch (error) {
    console.error('AirROI search error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Search failed' }, { status: 500 })
  }
}
