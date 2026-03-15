/**
 * POST /api/airdna/import
 * Import reviewed AirDNA listings into a campaign.
 * Runs dedup check before inserting.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { MappedListing } from '@/lib/airdna/mapper'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, listings } = body as {
      campaignId: string
      listings: MappedListing[]
    }

    if (!campaignId || !listings?.length) {
      return NextResponse.json({ error: 'campaignId and listings are required' }, { status: 400 })
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

    // Get existing listing IDs for this campaign (dedup)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingListings } = await (supabase as any)
      .from('listings')
      .select('listing_id')
      .eq('campaign_id', campaignId)

    const existingIds = new Set((existingListings ?? []).map((l: { listing_id: string }) => l.listing_id))

    const newListings = listings.filter(l => !existingIds.has(l.listing_id))
    const duplicates = listings.filter(l => existingIds.has(l.listing_id))

    if (newListings.length === 0) {
      return NextResponse.json({
        inserted: 0,
        duplicates: duplicates.length,
        message: 'All listings already exist in this campaign.',
      })
    }

    // Insert new listings
    const rows = newListings.map(listing => ({
      campaign_id: campaignId,
      user_id: user.id,
      listing_id: listing.listing_id,
      listing_url: listing.listing_url,
      listing_title: listing.listing_title,
      collection_source: 'airdna',
      property_type: listing.property_type,
      room_type: listing.room_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      max_guests: listing.max_guests,
      amenities: listing.amenities,
      city: listing.city,
      state: listing.state,
      country: listing.country,
      neighborhood: listing.neighborhood,
      latitude: listing.latitude,
      longitude: listing.longitude,
      avg_rating: listing.avg_rating,
      total_reviews: listing.total_reviews,
      nightly_rate: listing.nightly_rate,
      annual_revenue: listing.annual_revenue,
      occupancy_rate: listing.occupancy_rate,
      host_name: listing.host_name,
      host_id: listing.host_id,
      superhost: listing.superhost,
      response_rate: listing.response_rate,
      cover_image_url: listing.cover_image_url,
      raw_data: listing.raw_data,
      status: 'unscored',
    }))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: inserted, error: insertError } = await (supabase as any)
      .from('listings')
      .insert(rows)
      .select('id')

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: 'listings_imported',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: {
        source: 'airdna',
        inserted: inserted?.length ?? 0,
        duplicates: duplicates.length,
      },
    })

    return NextResponse.json({
      inserted: inserted?.length ?? 0,
      duplicates: duplicates.length,
      message: `Imported ${inserted?.length ?? 0} listings. ${duplicates.length} duplicates skipped.`,
    })
  } catch (error) {
    console.error('AirDNA import error:', error)
    const message = error instanceof Error ? error.message : 'Import failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
