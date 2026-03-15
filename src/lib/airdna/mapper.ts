/**
 * Maps AirDNA API responses to ListingScout's internal listing format
 */

import { AirDNAProperty } from './client'

export interface MappedListing {
  // Identity
  listing_id: string
  listing_url: string
  listing_title: string
  collection_source: 'airdna'

  // Property
  property_type: string
  room_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  amenities: string[] | null

  // Location
  city: string
  state: string
  country: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null

  // Performance
  avg_rating: number | null
  total_reviews: number
  nightly_rate: number | null
  annual_revenue: number | null
  occupancy_rate: number | null

  // Host
  host_name: string | null
  host_id: string | null
  superhost: boolean
  response_rate: number | null

  // Image
  cover_image_url: string | null

  // Raw data for reference
  raw_data: Record<string, unknown>
}

export function mapAirDNAProperty(prop: AirDNAProperty): MappedListing {
  const listingId = prop.airbnb_property_id
    ? String(prop.airbnb_property_id)
    : `vrbo-${prop.vrbo_property_id}`

  return {
    listing_id: listingId,
    listing_url: prop.listing_url,
    listing_title: prop.title,
    collection_source: 'airdna',

    property_type: prop.property_type,
    room_type: prop.room_type,
    bedrooms: prop.bedrooms,
    bathrooms: prop.bathrooms,
    max_guests: prop.accommodates,
    amenities: prop.amenities ?? null,

    city: prop.location?.city ?? '',
    state: prop.location?.state ?? '',
    country: prop.location?.country ?? null,
    neighborhood: prop.location?.neighborhood?.[0] ?? null,
    latitude: prop.latitude ?? null,
    longitude: prop.longitude ?? null,

    avg_rating: prop.rating_overall ?? null,
    total_reviews: prop.reviews ?? 0,
    nightly_rate: prop.price_nightly ?? prop.adr ?? null,
    annual_revenue: prop.revenue ?? null,
    occupancy_rate: prop.occ ?? null,

    host_name: null, // AirDNA doesn't expose host name in comp list
    host_id: prop.airbnb_host_id ? String(prop.airbnb_host_id) : null,
    superhost: prop.superhost ?? false,
    response_rate: prop.response_rate ?? null,

    cover_image_url: prop.img_cover ?? null,

    raw_data: prop as unknown as Record<string, unknown>,
  }
}

export function mapAirDNAProperties(props: AirDNAProperty[]): MappedListing[] {
  return props.map(mapAirDNAProperty)
}
