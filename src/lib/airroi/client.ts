/**
 * AirROI API Client
 * Base URL: https://api.airroi.com
 * Auth: X-API-KEY header
 * Docs: https://airroi.com/api/documentation
 * Pricing: $0.01/call, pay-as-you-go
 */

const AIRROI_BASE = 'https://api.airroi.com'

function getKey(): string {
  const key = process.env.AIRROI_API_KEY
  if (!key) throw new Error('AIRROI_API_KEY environment variable is not set')
  return key
}

async function fetchAirROI<T>(
  path: string,
  options: { method?: 'GET' | 'POST'; body?: unknown; params?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { method = 'GET', body, params } = options

  let url = `${AIRROI_BASE}${path}`
  if (params) {
    const searchParams = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null) searchParams.set(k, String(v))
    }
    const qs = searchParams.toString()
    if (qs) url += `?${qs}`
  }

  const res = await fetch(url, {
    method,
    headers: {
      'X-API-KEY': getKey(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    next: { revalidate: 0 }, // no cache during debugging
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AirROI API ${res.status}: ${text}`)
  }

  const json = await res.json()
  
  // Log top-level keys to help debug
  console.log(`AirROI ${method} ${path} → keys:`, Object.keys(json))

  // Normalize listings search response
  if (path.includes('/listings/search') && !json.listings) {
    const arrayKey = Object.keys(json).find(k => Array.isArray(json[k]))
    if (arrayKey) {
      console.log(`AirROI: remapping '${arrayKey}' → 'listings'`)
      json.listings = json[arrayKey]
    } else {
      json.listings = []
    }
  }

  // Normalize markets search response
  if (path.includes('/markets/search') && !json.markets) {
    const arrayKey = Object.keys(json).find(k => Array.isArray(json[k]))
    if (arrayKey) {
      console.log(`AirROI: remapping markets '${arrayKey}' → 'markets'`)
      json.markets = json[arrayKey]
    } else {
      json.markets = []
    }
  }

  return json as T
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AirROIListing {
  listing_id: number
  listing_type: string
  room_type: string
  title: string
  url: string
  latitude: number
  longitude: number
  country: string
  region: string
  locality: string
  district?: string
  // Property
  bedrooms: number
  beds: number
  baths: number
  guests: number
  amenities: string[]
  photos_count?: number
  // Host
  host_id: number
  host_name: string
  superhost: boolean
  professional_management?: boolean
  // Pricing
  price_nightly?: number
  cleaning_fee?: number
  extra_guest_fee?: number
  instant_book?: boolean
  min_nights?: number
  // Ratings
  rating_overall?: number
  rating_accuracy?: number
  rating_cleanliness?: number
  rating_checkin?: number
  rating_communication?: number
  rating_location?: number
  rating_value?: number
  num_reviews: number
  // TTM Performance (Trailing Twelve Months)
  ttm_revenue?: number
  ttm_occupancy?: number
  ttm_avg_rate?: number
  ttm_revpar?: number
  ttm_adjusted_occupancy?: number
  ttm_adjusted_revpar?: number
  ttm_days_booked?: number
  ttm_available_days?: number
  // L90D Performance (Last 90 Days)
  l90d_revenue?: number
  l90d_occupancy?: number
  l90d_avg_rate?: number
  l90d_revpar?: number
  l90d_days_booked?: number
  l90d_available_days?: number
  // Image
  cover_photo_url?: string
}

export interface AirROIMarket {
  country: string
  region?: string
  locality?: string
  district?: string
}

export interface AirROIFilter {
  room_type?: { eq: string }
  bedrooms?: { gte?: number; lte?: number; range?: [number, number]; eq?: number }
  baths?: { gte?: number; lte?: number }
  guests?: { gte?: number; range?: [number, number] }
  amenities?: { all?: string[]; any?: string[]; none?: string[] }
  superhost?: { eq: boolean }
  rating_overall?: { gte?: number }
  num_reviews?: { gte?: number }
  ttm_revenue?: { gte?: number; lte?: number; range?: [number, number] }
  ttm_occupancy?: { gte?: number }
  ttm_avg_rate?: { range?: [number, number]; gte?: number; lte?: number }
  l90d_occupancy?: { gte?: number }
  instant_book?: { eq: boolean }
  min_nights?: { lte?: number }
  [key: string]: unknown
}

export interface AirROISort {
  ttm_revenue?: 'asc' | 'desc'
  ttm_occupancy?: 'asc' | 'desc'
  ttm_avg_rate?: 'asc' | 'desc'
  rating_overall?: 'asc' | 'desc'
  num_reviews?: 'asc' | 'desc'
  [key: string]: 'asc' | 'desc' | undefined
}

export interface AirROIPagination {
  page_size?: number
  offset?: number
}

// ─── Search Listings by Market ────────────────────────────────────────────────

export interface SearchByMarketParams {
  market: AirROIMarket | null
  filter?: AirROIFilter
  sort?: AirROISort
  pagination?: AirROIPagination
  currency?: 'usd' | 'native'
}

export interface SearchByMarketResponse {
  listings: AirROIListing[]
  total?: number
  pagination?: { page_size: number; offset: number; total: number }
}

export async function searchListingsByMarket(params: SearchByMarketParams): Promise<SearchByMarketResponse> {
  return fetchAirROI<SearchByMarketResponse>('/listings/search/market', {
    method: 'POST',
    body: params,
  })
}

// ─── Search Listings by Radius ────────────────────────────────────────────────

export interface SearchByRadiusParams {
  latitude: number
  longitude: number
  radius_miles: number
  filter?: AirROIFilter
  sort?: AirROISort
  pagination?: AirROIPagination
  currency?: 'usd' | 'native'
}

export async function searchListingsByRadius(params: SearchByRadiusParams): Promise<SearchByMarketResponse> {
  return fetchAirROI<SearchByMarketResponse>('/listings/search/radius', {
    method: 'POST',
    body: params,
  })
}

// ─── Single Listing ───────────────────────────────────────────────────────────

export interface SingleListingResponse {
  listing: AirROIListing
}

export async function getListing(id: number, currency?: 'usd' | 'native'): Promise<SingleListingResponse> {
  return fetchAirROI<SingleListingResponse>('/listings', {
    params: { id, currency: currency ?? 'usd' },
  })
}

// ─── Batch Listings ───────────────────────────────────────────────────────────

export interface BatchListingsResponse {
  listings: AirROIListing[]
  errors?: { id: number; error: string }[]
}

export async function batchGetListings(ids: number[], currency?: 'usd' | 'native'): Promise<BatchListingsResponse> {
  return fetchAirROI<BatchListingsResponse>('/listings/batch', {
    method: 'POST',
    body: { listing_ids: ids, currency: currency ?? 'usd' },
  })
}

// ─── Comparable Listings ──────────────────────────────────────────────────────

export interface ComparableListingsResponse {
  listings: AirROIListing[]
}

export async function getComparableListings(params: {
  latitude?: number
  longitude?: number
  address?: string
  bedrooms: number
  baths: number
  guests: number
  currency?: 'usd' | 'native'
}): Promise<ComparableListingsResponse> {
  return fetchAirROI<ComparableListingsResponse>('/listings/comparables', {
    params: {
      ...params,
      currency: params.currency ?? 'usd',
    },
  })
}

// ─── Revenue Calculator ───────────────────────────────────────────────────────

export interface RevenueEstimateResponse {
  revenue: number
  average_daily_rate: number
  occupancy: number
  currency: string
  location: { lat: number; lng: number }
  percentiles?: {
    p25: { revenue: number; adr: number; occupancy: number }
    p50: { revenue: number; adr: number; occupancy: number }
    p75: { revenue: number; adr: number; occupancy: number }
    p90: { revenue: number; adr: number; occupancy: number }
  }
  comparable_listings?: AirROIListing[]
}

export async function getRevenueEstimate(params: {
  lat?: number
  lng?: number
  address?: string
  bedrooms: number
  baths: number
  guests: number
  currency?: 'usd' | 'native'
}): Promise<RevenueEstimateResponse> {
  return fetchAirROI<RevenueEstimateResponse>('/calculator/estimate', {
    params: {
      ...params,
      currency: params.currency ?? 'usd',
    },
  })
}

// ─── Market Search ────────────────────────────────────────────────────────────

export interface MarketSearchResult {
  full_name: string
  country: string
  region?: string
  locality?: string
  district?: string
  active_listings_count?: number
  currency?: string
}

export interface MarketSearchResponse {
  markets: MarketSearchResult[]
}

export async function searchMarkets(query: string): Promise<MarketSearchResponse> {
  return fetchAirROI<MarketSearchResponse>('/markets/search', {
    params: { query },
  })
}

// ─── Market Summary ───────────────────────────────────────────────────────────

export interface MarketSummaryResponse {
  occupancy: number
  average_daily_rate: number
  rev_par: number
  revenue: number
  booking_lead_time: number
  length_of_stay: number
  active_listings_count: number
}

export async function getMarketSummary(params: {
  market: AirROIMarket
  filter?: AirROIFilter
  currency?: 'usd' | 'native'
  num_months?: number
}): Promise<MarketSummaryResponse> {
  return fetchAirROI<MarketSummaryResponse>('/markets/summary', {
    method: 'POST',
    body: params,
  })
}
