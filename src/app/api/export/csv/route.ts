import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaignId')
    const tier = searchParams.get('tier') // 'all', 'strong', 'moderate', 'weak'

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
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

    // Build query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('listings')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')
      .order('lead_score', { ascending: false, nullsFirst: false })

    if (tier && tier !== 'all') {
      query = query.eq('lead_tier', tier)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    // Build CSV
    const headers = [
      'Listing ID',
      'Title',
      'URL',
      'City',
      'State',
      'Neighborhood',
      'Property Type',
      'Bedrooms',
      'Bathrooms',
      'Max Guests',
      'Nightly Rate',
      'Rating',
      'Reviews',
      'Host Name',
      'Superhost',
      'Score',
      'Tier',
      'Collection Source',
      'Created At',
    ]

    const rows = (listings || []).map((l: Record<string, unknown>) => [
      l.listing_id,
      escapeCsvValue(l.listing_title as string),
      l.listing_url,
      escapeCsvValue(l.city as string),
      l.state,
      escapeCsvValue((l.neighborhood as string) || ''),
      l.property_type,
      l.bedrooms,
      l.bathrooms,
      l.max_guests,
      l.nightly_rate || '',
      l.avg_rating || '',
      l.total_reviews,
      escapeCsvValue((l.host_name as string) || ''),
      l.superhost ? 'Yes' : 'No',
      l.lead_score || '',
      l.lead_tier || '',
      l.collection_source,
      formatDate(l.created_at as string),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row: (string | number | boolean | null)[]) => row.join(',')),
    ].join('\n')

    // Create response with CSV
    const filename = `${campaign.name.replace(/[^a-zA-Z0-9]/g, '_')}_${tier || 'all'}_${new Date().toISOString().split('T')[0]}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error in GET /api/export/csv:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function escapeCsvValue(value: string): string {
  if (!value) return ''
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(isoString: string): string {
  if (!isoString) return ''
  return new Date(isoString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}
