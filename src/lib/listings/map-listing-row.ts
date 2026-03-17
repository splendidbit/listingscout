import { ListingRow } from '@/components/listings/listings-table'
import { Database } from '@/types/database'

type ListingDbRow = Database['public']['Tables']['listings']['Row']

/**
 * Maps a Supabase listing DB row (with score_breakdown JSON) into
 * the flat ListingRow shape consumed by ListingsTable and detail panels.
 *
 * Used by listings, leads, and weak pages — keep in sync with ListingRow.
 */
export function mapListingRow(l: ListingDbRow): ListingRow {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = (l.score_breakdown as Record<string, unknown> | null) ?? {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const row = l as any

  return {
    // Core fields (always present on the DB row)
    id: l.id,
    listing_id: l.listing_id,
    listing_url: l.listing_url,
    listing_title: l.listing_title,
    city: l.city,
    state: l.state,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    max_guests: l.max_guests,
    nightly_rate: l.nightly_rate,
    avg_rating: l.avg_rating,
    total_reviews: l.total_reviews,
    host_name: l.host_name,
    superhost: l.superhost,
    lead_score: l.lead_score,
    lead_tier: l.lead_tier,

    // Opportunity scoring (from score_breakdown JSON)
    opportunity_score: (sb.opportunity_score as number) ?? null,
    lead_priority_rank: (sb.lead_priority_rank as string) ?? null,
    recommended_outreach_reason: (sb.recommended_outreach_reason as string) ?? null,
    occupancy_gap_score: (sb.occupancy_gap_score as number) ?? null,
    revpan_gap_score: (sb.revpan_gap_score as number) ?? null,
    pricing_inefficiency_score: (sb.pricing_inefficiency_score as number) ?? null,
    listing_quality_gap_score: (sb.listing_quality_gap_score as number) ?? null,
    momentum_score: (sb.momentum_score as number) ?? null,
    host_profile_score: (sb.host_profile_score as number) ?? null,
    occupancy_delta: (sb.occupancy_delta as number) ?? null,
    revpan_delta: (sb.revpan_delta as number) ?? null,
    adr_delta: (sb.adr_delta as number) ?? null,
    momentum_signal: (sb.momentum_signal as number) ?? null,
    estimated_revenue_upside: (sb.estimated_revenue_upside as number) ?? null,
    estimated_upside_pct: (sb.estimated_upside_pct as number) ?? null,
    cohost_presence: (sb.cohost_presence as boolean) ?? false,
    professional_management: (sb.professional_management as boolean) ?? false,
    host_type: (sb.host_type as string) ?? row.host_type ?? null,

    // Extended DB columns (not in generated types yet)
    host_listing_count: row.host_listing_count ?? null,
    photo_count: row.photo_count ?? null,
    amenities_count: row.amenities_count ?? null,
    ttm_avg_rate: row.ttm_avg_rate ?? null,
    ttm_revenue: row.ttm_revenue ?? null,
    ttm_occupancy: row.ttm_occupancy ?? null,
    market_avg_price: row.market_avg_price ?? null,
    market_avg_occupancy: row.market_avg_occupancy ?? null,
    market_avg_revenue: row.market_avg_revenue ?? null,

    // Legacy fields (score_breakdown with DB fallback)
    pricing_opportunity_score: (sb.pricing_opportunity_score as number) ?? row.pricing_opportunity_score ?? null,
    listing_quality_score: (sb.listing_quality_score as number) ?? row.listing_quality_score ?? null,
    review_momentum_score: (sb.review_momentum_score as number) ?? row.review_momentum_score ?? null,
    opportunity_notes: (sb.opportunity_notes as string) ?? row.opportunity_notes ?? null,
    outreach_angle: (sb.outreach_angle as string) ?? row.outreach_angle ?? null,
    ai_lead_score: (sb.ai_lead_score as number) ?? row.ai_lead_score ?? null,
    ai_bucket: (sb.ai_bucket as string) ?? row.ai_bucket ?? null,
  }
}

export function mapListingRows(rows: ListingDbRow[]): ListingRow[] {
  return rows.map(mapListingRow)
}
