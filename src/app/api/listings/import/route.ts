import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { batchCheckDuplicates } from '@/lib/dedup/engine'

interface ImportedListing {
  listing_id: string
  listing_url: string
  listing_title: string
  property_type?: string
  city: string
  state: string
  neighborhood?: string
  full_address?: string
  bedrooms?: number
  bathrooms?: number
  max_guests?: number
  nightly_rate?: number
  avg_rating?: number
  total_reviews?: number
  host_name?: string
  superhost?: boolean
}

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
      listings: ImportedListing[]
    }

    if (!campaignId || !listings || !Array.isArray(listings)) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Verify campaign ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign } = await (supabase as any)
      .from('campaigns')
      .select('id, name')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Validate listings
    const errors: string[] = []
    const validListings: ImportedListing[] = []

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i]
      const rowNum = i + 1

      if (!listing.listing_id) {
        errors.push(`Row ${rowNum}: Missing listing_id`)
        continue
      }
      if (!listing.listing_url) {
        errors.push(`Row ${rowNum}: Missing listing_url`)
        continue
      }
      if (!listing.listing_title) {
        errors.push(`Row ${rowNum}: Missing listing_title`)
        continue
      }
      if (!listing.city) {
        errors.push(`Row ${rowNum}: Missing city`)
        continue
      }
      if (!listing.state) {
        errors.push(`Row ${rowNum}: Missing state`)
        continue
      }

      validListings.push(listing)
    }

    if (validListings.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        errors,
      })
    }

    // Batch check for duplicates
    const dedupResults = await batchCheckDuplicates(
      campaignId,
      validListings.map(l => ({
        listing_id: l.listing_id,
        listing_title: l.listing_title,
        city: l.city,
        state: l.state,
        full_address: l.full_address,
      }))
    )

    // Filter out duplicates
    const newListings = validListings.filter(l => {
      const result = dedupResults.get(l.listing_id)
      return !result?.isDuplicate
    })

    const skippedCount = validListings.length - newListings.length

    // Insert new listings
    if (newListings.length > 0) {
      const insertData = newListings.map(l => ({
        campaign_id: campaignId,
        user_id: user.id,
        listing_id: l.listing_id,
        listing_url: l.listing_url,
        listing_title: l.listing_title,
        property_type: l.property_type ?? 'entire_home',
        city: l.city,
        state: l.state,
        neighborhood: l.neighborhood ?? null,
        full_address: l.full_address ?? null,
        bedrooms: l.bedrooms ?? 0,
        bathrooms: l.bathrooms ?? 0,
        max_guests: l.max_guests ?? 0,
        nightly_rate: l.nightly_rate ?? null,
        avg_rating: l.avg_rating ?? null,
        total_reviews: l.total_reviews ?? 0,
        host_name: l.host_name ?? null,
        superhost: l.superhost ?? false,
        collection_source: 'csv_import',
        lead_tier: 'unscored',
      }))

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: insertError } = await (supabase as any)
        .from('listings')
        .insert(insertData)

      if (insertError) {
        console.error('Error inserting listings:', insertError)
        return NextResponse.json(
          { error: `Failed to insert listings: ${insertError.message}` },
          { status: 500 }
        )
      }

      // Update campaign stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('refresh_campaign_stats', { p_campaign_id: campaignId })

      // Create audit log
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('audit_log').insert({
        user_id: user.id,
        campaign_id: campaignId,
        action: 'listings_imported',
        entity_type: 'listing',
        details: {
          imported: newListings.length,
          skipped: skippedCount,
          source: 'csv_import',
        },
      })
    }

    return NextResponse.json({
      imported: newListings.length,
      skipped: skippedCount,
      errors,
    })
  } catch (error) {
    console.error('Error in POST /api/listings/import:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
