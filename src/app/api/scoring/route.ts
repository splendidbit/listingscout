import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { scoreListing, ListingData } from '@/lib/scoring/engine'
import { CampaignCriteria } from '@/lib/types/criteria'

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

    // Get campaign with criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id, criteria')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const criteria = campaign.criteria as CampaignCriteria

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
      // Only score unscored listings
      query = query.is('lead_score', null)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        scored: 0,
        message: 'No listings to score',
      })
    }

    // Score each listing
    let scoredCount = 0
    const errors: string[] = []

    for (const listing of listings) {
      try {
        const listingData: ListingData = {
          city: listing.city,
          state: listing.state,
          neighborhood: listing.neighborhood,
          property_type: listing.property_type,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          max_guests: listing.max_guests,
          amenities: listing.amenities,
          avg_rating: listing.avg_rating,
          total_reviews: listing.total_reviews,
          nightly_rate: listing.nightly_rate,
          host_name: listing.host_name,
          host_listing_count: listing.host_listing_count,
          host_response_rate: listing.host_response_rate,
          host_since: listing.host_since,
          superhost: listing.superhost,
          // Owner data if available via join
          owner_verified: false,
          has_email: false,
          has_phone: false,
          has_linkedin: false,
        }

        const result = scoreListing(listingData, criteria)

        // Update listing with score
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('listings')
          .update({
            lead_score: result.total,
            lead_tier: result.tier,
            score_breakdown: result.breakdown,
            flags: result.flags,
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('refresh_campaign_stats', { p_campaign_id: campaignId })

    // Create audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: rescore ? 'listings_rescored' : 'listings_scored',
      entity_type: 'listing',
      details: {
        scored: scoredCount,
        errors: errors.length,
        rescore,
      },
    })

    return NextResponse.json({
      scored: scoredCount,
      total: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in POST /api/scoring:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
