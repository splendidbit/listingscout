/**
 * POST /api/airroi/import
 * Import reviewed AirROI listings into a campaign with dedup.
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { MappedListing } from '@/lib/airroi/mapper'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, listings } = body as { campaignId: string; listings: MappedListing[] }

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
      campaign_id: campaignId,
      user_id: user.id,
      listing_id: l.listing_id,
      listing_url: l.listing_url,
      listing_title: l.listing_title,
      collection_source: 'airroi',
      property_type: l.property_type,
      room_type: l.room_type,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      max_guests: l.max_guests,
      amenities: l.amenities,
      city: l.city,
      state: l.state,
      country: l.country,
      neighborhood: l.neighborhood,
      latitude: l.latitude,
      longitude: l.longitude,
      avg_rating: l.avg_rating,
      total_reviews: l.total_reviews,
      nightly_rate: l.nightly_rate,
      annual_revenue: l.annual_revenue,
      occupancy_rate: l.occupancy_rate,
      host_name: l.host_name,
      host_id: l.host_id,
      superhost: l.superhost,
      response_rate: l.response_rate,
      cover_image_url: l.cover_image_url,
      raw_data: l.raw_data,
      status: 'unscored',
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
