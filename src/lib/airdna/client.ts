/**
 * AirDNA API Client
 * Base URL: https://api.airdna.co/client/v1
 * Auth: access_token query param
 * Docs: https://apidocs.airdna.co/
 */

const AIRDNA_BASE = 'https://api.airdna.co/client/v1'

function getToken(): string {
  const token = process.env.AIRDNA_API_KEY
  if (!token) throw new Error('AIRDNA_API_KEY environment variable is not set')
  return token
}

function buildUrl(path: string, params: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${AIRDNA_BASE}${path}`)
  url.searchParams.set('access_token', getToken())
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      url.searchParams.set(key, String(val))
    }
  }
  return url.toString()
}

async function fetchAirDNA<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 3600 }, // cache 1h
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`AirDNA API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AirDNAPropertyLocation {
  city: string
  state: string
  country: string
  neighborhood: string[]
  zipcode?: string
  msa?: string
}

export interface AirDNAProperty {
  airbnb_property_id: number | null
  vrbo_property_id?: string | null
  airbnb_host_id?: number | null
  title: string
  listing_url: string
  property_type: string
  room_type: string
  bedrooms: number
  bathrooms: number
  accommodates: number
  latitude?: number
  longitude?: number
  location?: AirDNAPropertyLocation
  // Performance
  adr: number
  occ: number
  revenue: number
  reviews: number
  rating_overall: number
  superhost: boolean
  response_rate?: number
  days_r_ltm?: number // days reserved last 12 months
  days_a_ltm?: number // days available last 12 months
  num_res_ltm?: number // number of reservations last 12 months
  // Pricing
  price_nightly?: number
  price_weekly?: number
  price_monthly?: number
  cleaning_fee?: number
  // Listing meta
  instant_book?: boolean
  minimum_stay?: number
  listed_dt?: string
  img_cover?: string
  // Amenities (when show_amenities=True)
  amenities?: string[]
}

export interface CompListResponse {
  properties: AirDNAProperty[]
  area_info?: {
    geom?: {
      code?: { city?: string; state?: string; country?: string }
      name?: { city?: string; state?: string; country?: string }
      id?: { city?: number; state?: number; country?: number }
    }
  }
  request_info?: Record<string, unknown>
}

export interface SinglePropertyResponse {
  property_details: AirDNAProperty
  request_info?: Record<string, unknown>
}

export interface RentalizerSummary {
  property_details: {
    address: string
    bedrooms: number
    bathrooms: number
    accommodates: number
    location: { lat: number; lng: number }
  }
  property_stats: {
    adr: { ltm: number }
    occupancy: { ltm: number }
    revenue: { ltm: number }
  }
  permission: string
}

export interface MarketSearchResult {
  id: number
  name: string
  type: 'city' | 'region'
  country: string
  state?: string
}

// ─── Comp List ────────────────────────────────────────────────────────────────

export interface CompListParams {
  city_id?: number
  region_id?: number
  // Point-radius search (alternative to city/region)
  address?: string
  lat?: number
  lng?: number
  radius?: number // meters, required for point-radius
  // Filters
  bedrooms?: number
  accommodates?: number
  room_types?: 'entire_home' | 'private_room' | 'shared_room'
  adr_min?: number
  adr_max?: number
  // Sorting
  order?: 'revenue' | 'reviews' | 'adr' | 'proximity'
  desc?: boolean
  // Output
  limit?: number // max 25
  show_amenities?: boolean
  show_images?: boolean
  show_location?: boolean
  currency?: 'usd' | 'native'
}

export async function getCompList(params: CompListParams): Promise<CompListResponse> {
  const url = buildUrl('/market/property/list', {
    ...params,
    show_location: params.show_location ?? true,
    show_amenities: params.show_amenities ?? true,
    currency: params.currency ?? 'usd',
    limit: params.limit ?? 25,
  })
  return fetchAirDNA<CompListResponse>(url)
}

// ─── Single Property ──────────────────────────────────────────────────────────

export async function getSingleProperty(
  propertyId: number | string,
  options?: { show_amenities?: boolean; show_images?: boolean; show_location?: boolean; currency?: string }
): Promise<SinglePropertyResponse> {
  const url = buildUrl('/market/property', {
    property_id: propertyId,
    show_location: options?.show_location ?? true,
    show_amenities: options?.show_amenities ?? true,
    show_images: options?.show_images ?? false,
    currency: options?.currency ?? 'usd',
  })
  return fetchAirDNA<SinglePropertyResponse>(url)
}

// ─── Rentalizer Summary ───────────────────────────────────────────────────────

export async function getRentalizerSummary(params: {
  address?: string
  lat?: number
  lng?: number
  bedrooms?: number
  bathrooms?: number
  accommodates?: number
  currency?: string
}): Promise<RentalizerSummary> {
  const url = buildUrl('/rentalizer/ltm', {
    ...params,
    currency: params.currency ?? 'usd',
  })
  return fetchAirDNA<RentalizerSummary>(url)
}
