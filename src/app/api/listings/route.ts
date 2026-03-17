import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { checkDuplicateInCampaign } from '@/lib/dedup/engine'

/** Fields a client is allowed to update via PUT. Prevents mass-assignment. */
const UPDATABLE_FIELDS = new Set([
  'listing_title', 'property_type', 'city', 'state', 'neighborhood', 'full_address',
  'bedrooms', 'bathrooms', 'max_guests', 'nightly_rate', 'cleaning_fee',
  'avg_rating', 'total_reviews', 'host_name', 'host_since', 'host_listing_count',
  'host_response_rate', 'superhost', 'amenities', 'instant_book',
  'cancellation_policy', 'notes', 'lead_tier', 'status', 'flags',
])

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      campaign_id,
      listing_id,
      listing_url,
      listing_title,
      property_type = 'entire_home',
      city,
      state,
      neighborhood,
      full_address,
      bedrooms = 0,
      bathrooms = 0,
      max_guests = 0,
      nightly_rate,
      cleaning_fee,
      avg_rating,
      total_reviews = 0,
      host_name,
      host_since,
      host_listing_count,
      host_response_rate,
      superhost = false,
      amenities,
      instant_book,
      cancellation_policy,
      notes,
      collection_source = 'manual',
      skip_dedup = false,
    } = body

    // Validate required fields
    if (!campaign_id || !listing_id || !listing_url || !listing_title || !city || !state) {
      return NextResponse.json(
        { error: 'Missing required fields: campaign_id, listing_id, listing_url, listing_title, city, state' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign } = await (supabase as any)
      .from('campaigns')
      .select('id')
      .eq('id', campaign_id)
      .eq('user_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Check for duplicates unless skipped
    if (!skip_dedup) {
      const dedupResult = await checkDuplicateInCampaign(campaign_id, {
        listing_id,
        listing_title,
        city,
        state,
        full_address,
      })

      if (dedupResult.isDuplicate) {
        return NextResponse.json({
          error: 'Duplicate listing detected',
          duplicate: dedupResult,
        }, { status: 409 })
      }
    }

    // Insert listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .insert({
        campaign_id,
        user_id: user.id,
        listing_id,
        listing_url,
        listing_title,
        property_type,
        city,
        state,
        neighborhood,
        full_address,
        bedrooms,
        bathrooms,
        max_guests,
        nightly_rate,
        cleaning_fee,
        avg_rating,
        total_reviews,
        host_name,
        host_since,
        host_listing_count,
        host_response_rate,
        superhost,
        amenities,
        instant_book,
        cancellation_policy,
        notes,
        collection_source,
        lead_tier: 'unscored',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating listing:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update campaign stats
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).rpc('refresh_campaign_stats', { p_campaign_id: campaign_id })

    // Create audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id,
      action: 'listing_created',
      entity_type: 'listing',
      entity_id: listing.id,
      details: { listing_id, listing_title, source: collection_source },
    })

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error in POST /api/listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...rawUpdates } = body

    if (!id) {
      return NextResponse.json({ error: 'Listing ID is required' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {}
    for (const key of Object.keys(rawUpdates)) {
      if (UPDATABLE_FIELDS.has(key)) {
        updates[key] = rawUpdates[key]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Get current listing for audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: currentListing } = await (supabase as any)
      .from('listings')
      .select('*, campaigns!inner(user_id)')
      .eq('id', id)
      .single()

    if (!currentListing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const campaign = currentListing.campaigns as any
    if (campaign.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update listing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error } = await (supabase as any)
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating listing:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: currentListing.campaign_id,
      action: 'listing_updated',
      entity_type: 'listing',
      entity_id: id,
      details: { updated_fields: Object.keys(updates) },
      previous_value: currentListing,
      new_value: listing,
    })

    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error in PUT /api/listings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
