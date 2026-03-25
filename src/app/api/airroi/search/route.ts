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
  AirROIMarket,
  MarketSummaryResponse,
} from '@/lib/airroi/client'
import { scoreListing, ListingData, ScoringResult } from '@/lib/scoring/engine'
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
  professional_management: boolean
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
  ttm_revpar: number | null
  l90d_revenue: number | null
  l90d_occupancy: number | null
  l90d_avg_rate: number | null
  l90d_revpar: number | null
  rating_cleanliness: number | null
  rating_accuracy: number | null
  rating_communication: number | null
  rating_location: number | null
  rating_checkin: number | null
  rating_value: number | null
  market_avg_price: number | null
  market_avg_occupancy: number | null
  market_avg_revenue: number | null
  market_avg_revpar: number | null
  market_avg_adr: number | null
  // Scoring results
  opportunity_score: number
  lead_priority_rank: string
  recommended_outreach_reason: string
  occupancy_gap_score: number
  revpan_gap_score: number
  pricing_inefficiency_score: number
  listing_quality_gap_score: number
  momentum_score: number
  host_profile_score: number
  occupancy_delta: number | null
  revpan_delta: number | null
  adr_delta: number | null
  momentum_signal: number | null
  estimated_revenue_upside: number | null
  estimated_upside_pct: number | null
  cohost_presence: boolean
  // Backward compat
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
  is_active: boolean
  cover_image_url: string | null
  raw_data: Record<string, unknown>
}

function normalizeOccupancy(value: number | null): number | null {
  if (value === null) return null
  return value > 1 ? value / 100 : value
}

function matchesHostPreference(listing: EnrichedListing, criteria: CampaignCriteria): boolean {
  if (criteria.host.preferred_type === 'business') {
    return listing.professional_management || (listing.host_listing_count ?? 0) > 1
  }

  if (criteria.host.preferred_type === 'individual') {
    return !listing.professional_management && ((listing.host_listing_count ?? 1) <= 1)
  }

  return true
}

function getRequestedRoomType(types: string[]): 'private_room' | 'entire_home' | undefined {
  if (types.includes('private_room')) return 'private_room'
  if (types.includes('entire_home')) return 'entire_home'
  return undefined
}

function matchesPropertyType(listing: EnrichedListing, selectedTypes: string[]): boolean {
  if (selectedTypes.length === 0) return true

  const roomType = listing.room_type.toLowerCase()
  const propertyType = listing.property_type.toLowerCase()

  return selectedTypes.some(type => {
    const normalized = type.toLowerCase()
    return roomType === normalized || propertyType.includes(normalized.replaceAll('_', ' '))
  })
}

async function fetchSearchPages(params: {
  isRadiusSearch: boolean
  latitude?: number
  longitude?: number
  radius_miles?: number
  marketParams: AirROIMarket | null
  filter: AirROIFilter
  sort: AirROISort
  pages: number
}): Promise<AirROIListing[]> {
  const pagePromises = Array.from({ length: params.pages }, (_, i) =>
    params.isRadiusSearch
      ? searchListingsByRadius({
          latitude: params.latitude!,
          longitude: params.longitude!,
          radius_miles: params.radius_miles ?? 5,
          filter: params.filter,
          sort: params.sort,
          pagination: { page_size: 10, offset: i * 10 },
          currency: 'usd',
        })
      : searchListingsByMarket({
          market: params.marketParams,
          filter: params.filter,
          sort: params.sort,
          pagination: { page_size: 10, offset: i * 10 },
          currency: 'usd',
        })
  )

  const pageResults = await Promise.allSettled(pagePromises)
  const seen = new Set<number>()
  const rawListings: AirROIListing[] = []

  for (const pageResult of pageResults) {
    if (pageResult.status !== 'fulfilled') {
      console.error('[AirROI search] page fetch failed:', pageResult.reason?.message ?? pageResult.reason)
      continue
    }

    for (const listing of pageResult.value.listings ?? []) {
      const id = listing.listing_info?.listing_id
      if (!id || seen.has(id)) continue
      seen.add(id)
      rawListings.push(listing)
    }
  }

  return rawListings
}

function mapAirROIToEnriched(
  listing: AirROIListing,
  market: MarketSummaryResponse | null
): EnrichedListing {
  const li = listing.listing_info ?? {}
  const hi = listing.host_info ?? {}
  const loc = listing.location_info ?? {}
  const pd = listing.property_details ?? {}
  const bs = listing.booking_settings ?? {}
  const pi = listing.pricing_info ?? {}
  const rat = listing.ratings ?? {}
  const pm = listing.performance_metrics ?? {}

  const listingId = String(li.listing_id ?? '')
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
    host_type: 'independent', // overwritten by scoring
    superhost: hi.superhost ?? false,
    professional_management: hi.professional_management ?? false,

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
    ttm_revpar: pm.ttm_revpar ?? null,
    l90d_revenue: pm.l90d_revenue ?? null,
    l90d_occupancy: pm.l90d_occupancy ?? null,
    l90d_avg_rate: pm.l90d_avg_rate ?? null,
    l90d_revpar: pm.l90d_revpar ?? null,

    rating_cleanliness: rat.rating_cleanliness ?? null,
    rating_accuracy: rat.rating_accuracy ?? null,
    rating_communication: rat.rating_communication ?? null,
    rating_location: rat.rating_location ?? null,
    rating_checkin: rat.rating_checkin ?? null,
    rating_value: rat.rating_value ?? null,

    market_avg_price: market?.average_daily_rate ?? null,
    market_avg_occupancy: market?.occupancy ?? null,
    market_avg_revenue: market?.revenue ?? null,
    market_avg_revpar: market?.rev_par ?? null,
    market_avg_adr: market?.average_daily_rate ?? null,

    // Scoring defaults — overwritten below
    opportunity_score: 0,
    lead_priority_rank: 'cold',
    recommended_outreach_reason: '',
    occupancy_gap_score: 0,
    revpan_gap_score: 0,
    pricing_inefficiency_score: 0,
    listing_quality_gap_score: 0,
    momentum_score: 0,
    host_profile_score: 0,
    occupancy_delta: null,
    revpan_delta: null,
    adr_delta: null,
    momentum_signal: null,
    estimated_revenue_upside: null,
    estimated_upside_pct: null,
    cohost_presence: false,
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

    is_active: true,
    cover_image_url: li.cover_photo_url ?? null,
    raw_data: listing as unknown as Record<string, unknown>,
  }
}

function applyScores(listing: EnrichedListing, scores: ScoringResult): EnrichedListing {
  return {
    ...listing,
    opportunity_score: scores.opportunity_score,
    lead_priority_rank: scores.lead_priority_rank,
    recommended_outreach_reason: scores.recommended_outreach_reason,
    occupancy_gap_score: scores.occupancy_gap_score,
    revpan_gap_score: scores.revpan_gap_score,
    pricing_inefficiency_score: scores.pricing_inefficiency_score,
    listing_quality_gap_score: scores.listing_quality_gap_score,
    momentum_score: scores.momentum_score,
    host_profile_score: scores.host_profile_score,
    occupancy_delta: scores.occupancy_delta,
    revpan_delta: scores.revpan_delta,
    adr_delta: scores.adr_delta,
    momentum_signal: scores.momentum_signal,
    estimated_revenue_upside: scores.estimated_revenue_upside,
    estimated_upside_pct: scores.estimated_upside_pct,
    host_type: scores.host_type,
    cohost_presence: scores.cohost_presence,
    revenue_potential_score: scores.revenue_potential_score,
    pricing_opportunity_score: scores.pricing_opportunity_score,
    listing_quality_score: scores.listing_quality_score,
    review_momentum_score: scores.review_momentum_score,
    competition_pressure_score: scores.competition_pressure_score,
    ai_bucket: scores.ai_bucket,
    lead_tier: scores.lead_tier,
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

    // Keep provider-side filtering broad enough to avoid empty responses caused by overly strict upstream matching.
    const filter: AirROIFilter = {}
    const requestedRoomType = getRequestedRoomType(criteria.property.types)
    if (requestedRoomType) filter.room_type = { eq: requestedRoomType }
    if (criteria.host.superhost_required) filter.superhost = { eq: true }
    const VALID_AIRROI_AMENITIES = new Set(['wifi','pool','hot_tub','dedicated_workspace','kitchen','washer','dryer','free_parking_on_premises','air_conditioning','heating','indoor_fireplace','gym','ev_charger','pets_allowed','bbq_grill','patio_or_balcony','beach_access','waterfront','ski_in_ski_out','lake_access','sauna','fire_pit','bathtub','bikes','dishwasher','iron','refrigerator','tv','coffee_maker','microwave','oven','stove','private_entrance','luggage_dropoff_allowed'])
    const validAmenities = criteria.property.required_amenities.filter(a => VALID_AIRROI_AMENITIES.has(a))
    if (validAmenities.length > 0) filter.amenities = { all: validAmenities }

    // Sort ascending by revenue to surface underperformers
    const sort: AirROISort = { ttm_revenue: 'asc', ttm_occupancy: 'asc' }
    const desiredCount = Math.min(page_size, 50)
    const pages = Math.ceil(desiredCount / 10)

    const marketParams = isMarketSearch
      ? { country: country!, ...(region && { region }), ...(locality && { locality }), ...(district && { district }) }
      : null

    const [marketSummary] = await Promise.allSettled([
      marketParams ? getMarketSummary({ market: marketParams, currency: 'usd' }) : Promise.resolve(null),
    ])

    const market = marketSummary.status === 'fulfilled' ? marketSummary.value : null

    console.log('[AirROI search] params:', JSON.stringify({ marketParams, filter, sort, pages, isRadiusSearch }))

    let rawListings = await fetchSearchPages({
      isRadiusSearch,
      latitude,
      longitude,
      radius_miles,
      marketParams,
      filter,
      sort,
      pages,
    })
    console.log(`[AirROI search] fetchSearchPages returned ${rawListings.length} listings`)

    if (!isRadiusSearch && rawListings.length === 0 && marketParams?.country && marketParams.locality) {
      console.log('[AirROI search] fallback: retrying with broader market params')
      const broaderMarket = {
        country: marketParams.country,
        locality: marketParams.locality,
      }

      rawListings = await fetchSearchPages({
        isRadiusSearch: false,
        marketParams: broaderMarket,
        filter,
        sort,
        pages,
      })
      console.log(`[AirROI search] fallback returned ${rawListings.length} listings`)
    }

    // Post-fetch quality filter: remove listings without IDs or below campaign review floor.
    rawListings = rawListings.filter(l => {
      if (!l.listing_info?.listing_id) return false
      const reviews = l.ratings?.num_reviews ?? l.ratings?.review_count ?? 0
      return reviews >= criteria.performance.min_reviews
    })
    console.log(`[AirROI search] after ID + review floor filter: ${rawListings.length}`)

    // Filter out likely-dead/inactive listings
    rawListings = rawListings.filter(l => {
      const reviews = l.ratings?.num_reviews ?? l.ratings?.review_count ?? 0
      const lastRevenue = l.performance_metrics?.l90d_revenue ?? null
      const ttmRevenue = l.performance_metrics?.ttm_revenue ?? null
      const ttmOccupancy = l.performance_metrics?.ttm_occupancy ?? null

      // Ignore obviously inactive inventory, but do not override the campaign's own review threshold.
      if (reviews < Math.max(criteria.performance.min_reviews, 3)) return false

      // If l90d_revenue is 0 or null AND ttm_occupancy < 5%, likely inactive
      if (lastRevenue !== null && lastRevenue <= 0 && ttmOccupancy !== null && ttmOccupancy < 0.05) return false
      if (lastRevenue !== null && lastRevenue <= 0 && ttmRevenue !== null && ttmRevenue <= 0) return false

      return true
    })
    console.log(`[AirROI search] after dead listing filter: ${rawListings.length}`)

    // Map nested AirROI response → flat EnrichedListing
    let listings = rawListings.map((l: AirROIListing) => mapAirROIToEnriched(l, market))

    listings = listings.filter(listing => {
      if (!matchesPropertyType(listing, criteria.property.types)) return false
      if (listing.bedrooms < criteria.property.min_bedrooms) return false
      if (listing.bathrooms < criteria.property.min_bathrooms) return false
      if (listing.max_guests < criteria.property.min_guests) return false

      if (listing.avg_rating !== null && listing.avg_rating < criteria.performance.min_rating) return false
      if (listing.total_reviews < criteria.performance.min_reviews) return false

      const occupancyRate = normalizeOccupancy(listing.ttm_occupancy ?? listing.occupancy_rate)
      const minOccupancy = normalizeOccupancy(criteria.performance.min_occupancy_pct)
      if (occupancyRate !== null && minOccupancy !== null && occupancyRate < minOccupancy) return false

      if (listing.nightly_rate !== null && criteria.performance.nightly_rate_min > 0 && listing.nightly_rate < criteria.performance.nightly_rate_min) {
        return false
      }

      if (listing.nightly_rate !== null && criteria.performance.nightly_rate_max > 0 && listing.nightly_rate > criteria.performance.nightly_rate_max) {
        return false
      }

      return true
    })
    console.log(`[AirROI search] after criteria filter: ${listings.length}`)

    listings = listings.filter(l => {
      if (!matchesHostPreference(l, criteria)) return false

      if (criteria.host.min_listings > 0 && l.host_listing_count !== null && l.host_listing_count < criteria.host.min_listings) {
        return false
      }

      if (criteria.host.max_listings > 0 && l.host_listing_count !== null && l.host_listing_count > criteria.host.max_listings) {
        return false
      }

      return true
    })
    console.log(`[AirROI search] after host filter: ${listings.length}`)

    // Filter out already-optimized listings (high revenue + high rating = not a consulting target)
    listings = listings.filter(l => {
      const highRevenue = l.ttm_revenue !== null && l.ttm_revenue > 100000
      const highRating = l.avg_rating !== null && l.avg_rating >= 4.9
      return !(highRevenue && highRating)
    })
    console.log(`[AirROI search] after optimized filter: ${listings.length}`)

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
        l90d_avg_rate: l.l90d_avg_rate,
        avg_rating: l.avg_rating,
        total_reviews: l.total_reviews,
        occupancy_rate: l.occupancy_rate,
        ttm_occupancy: l.ttm_occupancy,
        annual_revenue: l.annual_revenue,
        ttm_revenue: l.ttm_revenue,
        l90d_revenue: l.l90d_revenue,
        ttm_revpar: l.ttm_revpar,
        l90d_revpar: l.l90d_revpar,
        host_listing_count: l.host_listing_count,
        superhost: l.superhost,
        professional_management: l.professional_management,
        rating_cleanliness: l.rating_cleanliness,
        rating_communication: l.rating_communication,
        rating_accuracy: l.rating_accuracy,
        rating_checkin: l.rating_checkin,
        rating_value: l.rating_value,
        market_avg_price: l.market_avg_price,
        market_avg_occupancy: l.market_avg_occupancy,
        market_avg_revenue: l.market_avg_revenue,
        market_avg_revpar: l.market_avg_revpar,
        market_avg_adr: l.market_avg_adr,
      }
      const scores = scoreListing(listingData)
      return applyScores(l, scores)
    })

    // AI analysis — run on ALL listings (key is set)
    if (process.env.OPENAI_API_KEY) {
      const marketData = {
        average_daily_rate: market?.average_daily_rate ?? null,
        occupancy: market?.occupancy ?? null,
        revenue: market?.revenue ?? null,
        active_listings_count: market?.active_listings_count ?? null,
      }

      const analysisPromises = listings
        .filter(l => !isAnalysisFresh(l.ai_analyzed_at))
        .map(async l => {
          try {
            const analysis = await analyzeListingWithAI(l as unknown as ListingData, marketData)
            return { listing_id: l.listing_id, analysis }
          } catch (err) {
            console.error(`AI analysis failed for ${l.listing_id}:`, err)
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

    // Sort by opportunity_score desc
    listings.sort((a, b) => b.opportunity_score - a.opportunity_score)

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
