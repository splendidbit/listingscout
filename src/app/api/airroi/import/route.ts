/**
 * POST /api/airroi/import
 * Import reviewed AirROI listings into a campaign with dedup.
 * Saves all enriched fields: scoring, AI analysis, market data, sub-ratings, etc.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { EnrichedListing } from '@/app/api/airroi/search/route'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, listings } = body as { campaignId: string; listings: EnrichedListing[] }

    if (!campaignId || !listings?.length) {
      return NextResponse.json({ error: 'campaignId and listings required' }, { status: 400 })
    }

    // Verify campaign ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Dedup check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from('listings')
      .select('listing_id')
      .eq('campaign_id', campaignId)

    const existingIds = new Set((existing ?? []).map((l: { listing_id: string }) => l.listing_id))
    const newListings = listings.filter(l => !existingIds.has(l.listing_id))
    const duplicates = listings.length - newListings.length

    if (newListings.length === 0) {
      return NextResponse.json({
        inserted: 0,
        duplicates,
        message: 'All listings already exist in this campaign.',
      })
    }

    const rows = newListings.map(l => ({
      // Core identity
      campaign_id: campaignId,
      user_id: user.id,
      listing_id: l.listing_id,
      listing_url: l.listing_url,
      listing_title: l.listing_title,
      collection_source: 'airroi',

      // Property
      property_type: l.property_type,
      room_type: l.room_type,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      max_guests: l.max_guests,
      amenities: l.amenities,
      amenities_count: l.amenities_count,
      photo_count: l.photo_count,

      // Location
      city: l.city,
      state: l.state,
      country: l.country,
      neighborhood: l.neighborhood,
      latitude: l.latitude,
      longitude: l.longitude,

      // Host
      host_name: l.host_name,
      host_id: l.host_id,
      host_listing_count: l.host_listing_count,
      host_type: l.host_type,
      superhost: l.superhost,

      // Pricing
      nightly_rate: l.nightly_rate,
      cleaning_fee: l.cleaning_fee,
      minimum_stay: l.minimum_stay,
      instant_book: l.instant_book,

      // Performance
      avg_rating: l.avg_rating,
      total_reviews: l.total_reviews,
      occupancy_rate: l.occupancy_rate,
      annual_revenue: l.annual_revenue,

      // Sub-ratings
      rating_cleanliness: l.rating_cleanliness,
      rating_accuracy: l.rating_accuracy,
      rating_communication: l.rating_communication,
      rating_location: l.rating_location,
      rating_checkin: l.rating_checkin,
      rating_value: l.rating_value,

      // Market comparison
      market_avg_price: l.market_avg_price,
      market_avg_occupancy: l.market_avg_occupancy,
      market_avg_revenue: l.market_avg_revenue,

      // Calculated scores
      revenue_potential_score: l.revenue_potential_score,
      pricing_opportunity_score: l.pricing_opportunity_score,
      listing_quality_score: l.listing_quality_score,
      review_momentum_score: l.review_momentum_score,
      competition_pressure_score: l.competition_pressure_score,

      // AI analysis
      ai_lead_score: l.ai_lead_score,
      ai_bucket: l.ai_bucket,
      opportunity_notes: l.opportunity_notes,
      outreach_angle: l.outreach_angle,
      ai_confidence: l.ai_confidence,
      ai_analyzed_at: l.ai_analyzed_at,

      // Pipeline
      lead_status: 'new',

      // Misc
      cover_image_url: l.cover_image_url,
      raw_data: l.raw_data,
      status: 'active',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('listings')
      .insert(rows)
      .select('id')

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: 'listings_imported',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: { source: 'airroi', inserted: inserted?.length ?? 0, duplicates },
    })

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      duplicates,
      message: `Imported ${inserted?.length ?? 0} listings. ${duplicates} duplicates skipped.`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
