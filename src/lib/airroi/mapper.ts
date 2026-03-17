/**
 * Maps AirROI nested API responses to ListingScout's internal format.
 * AirROI returns grouped sub-objects: listing_info, host_info, location_info, etc.
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
  amenities_count: number | null
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
  host_listing_count: number | null
  superhost: boolean
  professional_management: boolean
  response_rate: number | null
  cover_image_url: string | null
  ttm_revenue: number | null
  ttm_occupancy: number | null
  ttm_avg_rate: number | null
  ttm_revpar: number | null
  l90d_revenue: number | null
  l90d_occupancy: number | null
  l90d_avg_rate: number | null
  l90d_revpar: number | null
  description_length: number | null
  title_length: number | null
  raw_data: Record<string, unknown>
}

export function mapAirROIListing(listing: AirROIListing): MappedListing {
  const li = listing.listing_info ?? {}
  const hi = listing.host_info ?? {}
  const loc = listing.location_info ?? {}
  const pd = listing.property_details ?? {}
  const bs = listing.booking_settings ?? {}
  const pi = listing.pricing_info ?? {}
  const rat = listing.ratings ?? {}
  const pm = listing.performance_metrics ?? {}

  const listingId = String(li.listing_id ?? '')

  return {
    listing_id: listingId,
    listing_url: li.listing_url ?? `https://www.airbnb.com/rooms/${li.listing_id ?? ''}`,
    listing_title: li.listing_name ?? 'Untitled Listing',
    collection_source: 'airroi',
    property_type: li.listing_type ?? li.room_type ?? 'Entire home',
    room_type: li.room_type ?? 'entire_home',
    bedrooms: pd.bedrooms ?? 0,
    bathrooms: pd.baths ?? pd.bathrooms ?? 0,
    max_guests: pd.guests ?? pd.accommodates ?? 0,
    amenities: pd.amenities ?? null,
    amenities_count: pd.amenities ? pd.amenities.length : null,
    city: loc.locality ?? '',
    state: loc.region ?? '',
    country: loc.country ?? null,
    neighborhood: loc.district ?? null,
    latitude: loc.latitude ?? null,
    longitude: loc.longitude ?? null,
    avg_rating: rat.rating_overall ?? null,
    total_reviews: rat.num_reviews ?? rat.review_count ?? 0,
    nightly_rate: pi.price_nightly ?? pi.nightly_rate ?? pm.ttm_avg_rate ?? null,
    annual_revenue: pm.ttm_revenue ?? null,
    occupancy_rate: pm.ttm_occupancy ?? null,
    host_name: hi.host_name ?? null,
    host_id: hi.host_id ? String(hi.host_id) : null,
    host_listing_count: hi.host_listing_count ?? null,
    superhost: hi.superhost ?? false,
    professional_management: hi.professional_management ?? false,
    response_rate: null,
    cover_image_url: li.cover_photo_url ?? null,
    ttm_revenue: pm.ttm_revenue ?? null,
    ttm_occupancy: pm.ttm_occupancy ?? null,
    ttm_avg_rate: pm.ttm_avg_rate ?? null,
    ttm_revpar: pm.ttm_revpar ?? null,
    l90d_revenue: pm.l90d_revenue ?? null,
    l90d_occupancy: pm.l90d_occupancy ?? null,
    l90d_avg_rate: pm.l90d_avg_rate ?? null,
    l90d_revpar: pm.l90d_revpar ?? null,
    description_length: null,
    title_length: null,
    raw_data: listing as unknown as Record<string, unknown>,
  }
}

export function mapAirROIListings(listings: AirROIListing[]): MappedListing[] {
  return listings
    .filter(l => l.listing_info?.listing_id != null)
    .map(mapAirROIListing)
}
