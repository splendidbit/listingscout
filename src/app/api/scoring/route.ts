import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { scoreListing, ListingData } from '@/lib/scoring/engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, listingIds, rescore = false } = body as {
      campaignId: string
      listingIds?: string[]
      rescore?: boolean
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Verify campaign ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build query for listings to score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('listings')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')

    if (listingIds && listingIds.length > 0) {
      query = query.in('id', listingIds)
    } else if (!rescore) {
      query = query.is('lead_score', null)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ scored: 0, message: 'No listings to score' })
    }

    let scoredCount = 0
    const errors: string[] = []

    for (const listing of listings) {
      try {
        const listingData: ListingData = {
          listing_id: listing.listing_id,
          room_type: listing.room_type,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          max_guests: listing.max_guests,
          amenities: listing.amenities,
          amenities_count: listing.amenities_count,
          photo_count: listing.photo_count,
          description_length: listing.description_length,
          title_length: listing.title_length,
          host_listing_count: listing.host_listing_count,
          superhost: listing.superhost,
          host_response_rate: listing.host_response_rate,
          professional_management: listing.professional_management ?? false,
          cohost_presence: listing.cohost_presence ?? false,
          nightly_rate: listing.nightly_rate,
          ttm_avg_rate: listing.ttm_avg_rate ?? null,
          l90d_avg_rate: listing.l90d_avg_rate ?? null,
          cleaning_fee: listing.cleaning_fee,
          minimum_stay: listing.minimum_stay,
          instant_book: listing.instant_book,
          avg_rating: listing.avg_rating,
          total_reviews: listing.total_reviews,
          reviews_per_month: listing.reviews_per_month,
          occupancy_rate: listing.occupancy_rate,
          ttm_occupancy: listing.ttm_occupancy ?? null,
          annual_revenue: listing.annual_revenue,
          ttm_revenue: listing.ttm_revenue ?? null,
          l90d_revenue: listing.l90d_revenue ?? null,
          ttm_revpar: listing.ttm_revpar ?? null,
          l90d_revpar: listing.l90d_revpar ?? null,
          rating_cleanliness: listing.rating_cleanliness,
          rating_accuracy: listing.rating_accuracy,
          rating_communication: listing.rating_communication,
          rating_location: listing.rating_location,
          rating_checkin: listing.rating_checkin,
          rating_value: listing.rating_value,
          market_avg_price: listing.market_avg_price,
          market_avg_occupancy: listing.market_avg_occupancy,
          market_avg_revenue: listing.market_avg_revenue,
          market_avg_revpar: listing.market_avg_revpar ?? null,
          market_avg_adr: listing.market_avg_adr ?? null,
          city: listing.city,
          state: listing.state,
        }

        const result = scoreListing(listingData)

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('listings')
          .update({
            // Primary score fields
            lead_score: result.opportunity_score,
            revenue_potential_score: result.revenue_potential_score,
            opportunity_score: result.opportunity_score,
            pricing_opportunity_score: result.pricing_opportunity_score,
            listing_quality_score: result.listing_quality_score,
            review_momentum_score: result.review_momentum_score,
            competition_pressure_score: result.competition_pressure_score,
            // New opportunity fields
            occupancy_gap_score: result.occupancy_gap_score,
            revpan_gap_score: result.revpan_gap_score,
            pricing_inefficiency_score: result.pricing_inefficiency_score,
            listing_quality_gap_score: result.listing_quality_gap_score,
            momentum_score: result.momentum_score,
            host_profile_score: result.host_profile_score,
            occupancy_delta: result.occupancy_delta,
            revpan_delta: result.revpan_delta,
            adr_delta: result.adr_delta,
            momentum_signal: result.momentum_signal,
            estimated_revenue_upside: result.estimated_revenue_upside,
            estimated_upside_pct: result.estimated_upside_pct,
            lead_priority_rank: result.lead_priority_rank,
            recommended_outreach_reason: result.recommended_outreach_reason,
            host_type: result.host_type,
            ai_bucket: result.ai_bucket,
            lead_tier: result.lead_tier,
            scored_at: new Date().toISOString(),
          })
          .eq('id', listing.id)

        if (updateError) {
          errors.push(`Failed to update ${listing.listing_id}: ${updateError.message}`)
        } else {
          scoredCount++
        }
      } catch (err) {
        errors.push(`Error scoring ${listing.listing_id}: ${err}`)
      }
    }

    // Update campaign stats
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allListings } = await (supabase as any)
        .from('listings').select('lead_tier').eq('campaign_id', campaignId).eq('status', 'active')
      const rows = allListings ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('campaigns').update({
        total_listings: rows.length,
        strong_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'strong').length,
        moderate_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'moderate').length,
        weak_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'weak').length,
      }).eq('id', campaignId)
    } catch {
      // Non-fatal
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: rescore ? 'listings_rescored' : 'listings_scored',
      entity_type: 'listing',
      details: { scored: scoredCount, errors: errors.length, rescore },
    })

    return NextResponse.json({
      scored: scoredCount,
      total: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in POST /api/scoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
