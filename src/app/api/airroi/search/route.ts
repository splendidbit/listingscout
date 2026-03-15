/**
 * POST /api/airroi/search
 * Search AirROI for listings matching campaign criteria.
 * Returns enriched listings with scoring pre-calculated.
 *
 * Pipeline:
 * 1. Fetch listings from AirROI
 * 2. Fetch market summary for context
 * 3. Map to enriched format
 * 4. Run scoring on every listing
 * 5. Run AI analysis on listings with revenue_potential_score >= 40 (if OPENAI_API_KEY set)
 * 6. Filter: entire_home only, host_listing_count <= 9
 * 7. Sort by revenue_potential_score descending
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

// ─── Enriched Listing Type (returned to client) ───────────────────────────────

export interface EnrichedListing {
  // Identity
  listing_id: string
  listing_url: string
  listing_title: string
  collection_source: 'airroi'

  // Property
  property_type: string
  room_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  amenities: string[] | null
  amenities_count: number | null
  photo_count: number | null

  // Location
  city: string
  state: string
  country: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null

  // Host
  host_name: string | null
  host_id: string | null
  host_listing_count: number | null
  host_type: string
  superhost: boolean

  // Pricing
  nightly_rate: number | null
  ttm_avg_rate: number | null
  cleaning_fee: number | null
  minimum_stay: number | null
  instant_book: boolean | null

  // Performance
  avg_rating: number | null
  total_reviews: number
  occupancy_rate: number | null
  annual_revenue: number | null
  ttm_revenue: number | null
  ttm_occupancy: number | null
  l90d_revenue: number | null
  l90d_occupancy: number | null

  // Sub-ratings
  rating_cleanliness: number | null
  rating_accuracy: number | null
  rating_communication: number | null
  rating_location: number | null
  rating_checkin: number | null
  rating_value: number | null

  // Market comparison
  market_avg_price: number | null
  market_avg_occupancy: number | null
  market_avg_revenue: number | null

  // Opportunity scores
  revenue_potential_score: number
  pricing_opportunity_score: number
  listing_quality_score: number
  review_momentum_score: number
  competition_pressure_score: number
  lead_tier: string

  // AI analysis
  ai_lead_score: number | null
  ai_bucket: string
  opportunity_notes: string | null
  outreach_angle: string | null
  ai_confidence: number | null
  ai_analyzed_at: string | null

  // Cover image
  cover_image_url: string | null

  // Raw data for storage
  raw_data: Record<string, unknown>
}

// ─── Mapping ──────────────────────────────────────────────────────────────────

function mapAirROIToEnriched(
  listing: AirROIListing,
  market: MarketSummaryResponse | null
): EnrichedListing {
  const amenitiesCount = listing.amenities?.length ?? null
  const photoCount = listing.photos_count ?? null

  const enriched: EnrichedListing = {
    listing_id: String(listing.listing_id),
    listing_url: listing.url,
    listing_title: listing.title,
    collection_source: 'airroi',

    property_type: listing.listing_type ?? listing.room_type,
    room_type: listing.room_type,
    bedrooms: listing.bedrooms,
    bathrooms: listing.baths,
    max_guests: listing.guests,
    amenities: listing.amenities ?? null,
    amenities_count: amenitiesCount,
    photo_count: photoCount,

    city: listing.locality ?? '',
    state: listing.region ?? '',
    country: listing.country ?? null,
    neighborhood: listing.district ?? null,
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,

    host_name: listing.host_name ?? null,
    host_id: listing.host_id ? String(listing.host_id) : null,
    host_listing_count: null, // AirROI doesn't expose this in search results
    host_type: 'diy',         // Will be overwritten by scoring
    superhost: listing.superhost ?? false,

    nightly_rate: listing.price_nightly ?? listing.ttm_avg_rate ?? null,
    ttm_avg_rate: listing.ttm_avg_rate ?? null,
    cleaning_fee: listing.cleaning_fee ?? null,
    minimum_stay: listing.min_nights ?? null,
    instant_book: listing.instant_book ?? null,

    avg_rating: listing.rating_overall ?? null,
    total_reviews: listing.num_reviews ?? 0,
    occupancy_rate: listing.ttm_occupancy ?? null,
    annual_revenue: listing.ttm_revenue ?? null,
    ttm_revenue: listing.ttm_revenue ?? null,
    ttm_occupancy: listing.ttm_occupancy ?? null,
    l90d_revenue: listing.l90d_revenue ?? null,
    l90d_occupancy: listing.l90d_occupancy ?? null,

    rating_cleanliness: listing.rating_cleanliness ?? null,
    rating_accuracy: listing.rating_accuracy ?? null,
    rating_communication: listing.rating_communication ?? null,
    rating_location: listing.rating_location ?? null,
    rating_checkin: listing.rating_checkin ?? null,
    rating_value: listing.rating_value ?? null,

    market_avg_price: market?.average_daily_rate ?? null,
    market_avg_occupancy: market?.occupancy ?? null,
    market_avg_revenue: market?.revenue ?? null,

    // Placeholders — filled after scoring
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

    cover_image_url: listing.cover_photo_url ?? null,
    raw_data: listing as unknown as Record<string, unknown>,
  }

  return enriched
}

// ─── Route Handler ────────────────────────────────────────────────────────────

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

    // Get campaign
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

    // Build AirROI filter — keep loose so our scoring engine does the ranking.
    // Only apply hard filters for entire_home and explicit user-set criteria.
    const filter: AirROIFilter = {
      room_type: { eq: 'entire_home' },
    }

    // Only filter bedrooms if user explicitly set > 1
    if (criteria.property.min_bedrooms > 1) {
      filter.bedrooms = { gte: criteria.property.min_bedrooms }
    }

    // Only filter ADR if user set a non-default range (not 0-1000)
    if (criteria.performance.nightly_rate_min > 0 && criteria.performance.nightly_rate_max < 1000) {
      filter.ttm_avg_rate = {
        gte: criteria.performance.nightly_rate_min,
        lte: criteria.performance.nightly_rate_max,
      }
    }

    // Only hard-require superhost if explicitly required
    if (criteria.host.superhost_required) {
      filter.superhost = { eq: true }
    }

    // Only hard-require amenities if explicitly set
    if (criteria.property.required_amenities.length > 0) {
      filter.amenities = { all: criteria.property.required_amenities }
    }

    const sort: AirROISort = { ttm_revenue: 'desc', rating_overall: 'desc' }
    const pagination = { page_size: Math.min(page_size, 10), offset }

    // Fetch listings and market summary in parallel
    const marketParams = isMarketSearch
      ? { country: country!, ...(region && { region }), ...(locality && { locality }), ...(district && { district }) }
      : null

    const [result, marketSummary] = await Promise.allSettled([
      isRadiusSearch
        ? searchListingsByRadius({
            latitude: latitude!,
            longitude: longitude!,
            radius_miles: radius_miles ?? 5,
            filter,
            sort,
            pagination,
            currency: 'usd',
          })
        : searchListingsByMarket({
            market: marketParams,
            filter,
            sort,
            pagination,
            currency: 'usd',
          }),
      marketParams
        ? getMarketSummary({ market: marketParams, currency: 'usd' })
        : Promise.resolve(null),
    ])

    if (result.status === 'rejected') {
      throw new Error(result.reason instanceof Error ? result.reason.message : 'AirROI search failed')
    }

    const market = marketSummary.status === 'fulfilled' ? marketSummary.value : null
    const rawListings = result.value.listings ?? []

    // Map to enriched format
    let listings = rawListings.map((l: AirROIListing) => mapAirROIToEnriched(l, market))

    // Filter: entire_home only, exclude professional operators (10+ listings)
    listings = listings.filter(l =>
      l.room_type?.toLowerCase().includes('entire') &&
      (l.host_listing_count === null || l.host_listing_count <= 9)
    )

    // Score every listing
    listings = listings.map(l => {
      const listingData: ListingData = {
        ...l,
        nightly_rate: l.nightly_rate,
        ttm_avg_rate: l.ttm_avg_rate,
        occupancy_rate: l.occupancy_rate,
        ttm_occupancy: l.ttm_occupancy,
        annual_revenue: l.annual_revenue,
        ttm_revenue: l.ttm_revenue,
        market_avg_price: l.market_avg_price,
        market_avg_occupancy: l.market_avg_occupancy,
        market_avg_revenue: l.market_avg_revenue,
      }
      const scores = scoreListing(listingData)
      return {
        ...l,
        ...scores,
        host_type: scores.host_type,
        ai_bucket: scores.ai_bucket,
        lead_tier: scores.lead_tier,
      }
    })

    // AI analysis on listings with revenue_potential_score >= 40 (if configured)
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
            const listingData: ListingData = {
              ...l,
              nightly_rate: l.nightly_rate,
              market_avg_price: l.market_avg_price,
              market_avg_occupancy: l.market_avg_occupancy,
              market_avg_revenue: l.market_avg_revenue,
            }
            const analysis = await analyzeListingWithAI(listingData, marketData)
            return { listing_id: l.listing_id, analysis }
          } catch (err) {
            console.warn(`AI analysis failed for ${l.listing_id}:`, err)
            return null
          }
        })

      const analysisResults = await Promise.all(analysisPromises)

      // Merge AI analysis back into listings
      const analysisMap = new Map(
        analysisResults
          .filter((r): r is NonNullable<typeof r> => r !== null)
          .map(r => [r.listing_id, r.analysis])
      )

      listings = listings.map(l => {
        const analysis = analysisMap.get(l.listing_id)
        if (!analysis) return l
        return {
          ...l,
          ai_lead_score: analysis.ai_lead_score,
          opportunity_notes: analysis.opportunity_notes,
          outreach_angle: analysis.outreach_angle,
          ai_confidence: analysis.confidence,
          ai_analyzed_at: analysis.ai_analyzed_at,
        }
      })
    }

    // Sort by revenue_potential_score descending
    listings.sort((a, b) => b.revenue_potential_score - a.revenue_potential_score)

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
        results_count: listings.length,
        market: isMarketSearch ? { country, region, locality, district } : null,
        coordinates: isRadiusSearch ? { latitude, longitude, radius_miles } : null,
        ai_analyzed: !!process.env.OPENAI_API_KEY,
        market_avg_rate: market?.average_daily_rate ?? null,
        market_avg_occupancy: market?.occupancy ?? null,
      },
    })

    return NextResponse.json({
      listings,
      count: listings.length,
      total: result.value.pagination?.total ?? listings.length,
      campaign: { id: campaign.id, name: campaign.name },
      market: market
        ? {
            average_daily_rate: market.average_daily_rate,
            occupancy: market.occupancy,
            revenue: market.revenue,
            active_listings_count: market.active_listings_count,
          }
        : null,
    })
  } catch (error) {
    console.error('AirROI search error:', error)
    const message = error instanceof Error ? error.message : 'Search failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
