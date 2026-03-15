/**
 * Maps AirROI API responses to ListingScout's internal listing format
 */

import { AirROIListing } from './client'

export interface MappedListing {
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

  city: string
  state: string
  country: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null

  avg_rating: number | null
  total_reviews: number
  nightly_rate: number | null
  annual_revenue: number | null
  occupancy_rate: number | null

  host_name: string | null
  host_id: string | null
  superhost: boolean
  response_rate: number | null

  cover_image_url: string | null

  // AirROI-specific rich data
  ttm_revenue: number | null
  ttm_occupancy: number | null
  ttm_avg_rate: number | null
  l90d_revenue: number | null
  l90d_occupancy: number | null

  raw_data: Record<string, unknown>
}

export function mapAirROIListing(listing: AirROIListing): MappedListing {
  return {
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

    city: listing.locality ?? '',
    state: listing.region ?? '',
    country: listing.country ?? null,
    neighborhood: listing.district ?? null,
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,

    avg_rating: listing.rating_overall ?? null,
    total_reviews: listing.num_reviews ?? 0,
    nightly_rate: listing.price_nightly ?? listing.ttm_avg_rate ?? null,
    annual_revenue: listing.ttm_revenue ?? null,
    occupancy_rate: listing.ttm_occupancy ?? null,

    host_name: listing.host_name ?? null,
    host_id: listing.host_id ? String(listing.host_id) : null,
    superhost: listing.superhost ?? false,
    response_rate: null, // AirROI doesn't expose this field

    cover_image_url: listing.cover_photo_url ?? null,

    ttm_revenue: listing.ttm_revenue ?? null,
    ttm_occupancy: listing.ttm_occupancy ?? null,
    ttm_avg_rate: listing.ttm_avg_rate ?? null,
    l90d_revenue: listing.l90d_revenue ?? null,
    l90d_occupancy: listing.l90d_occupancy ?? null,

    raw_data: listing as unknown as Record<string, unknown>,
  }
}

export function mapAirROIListings(listings: AirROIListing[]): MappedListing[] {
  return listings.map(mapAirROIListing)
}
