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
      .order('revenue_potential_score', { ascending: false, nullsFirst: false })

    if (tier && tier !== 'all') {
      query = query.eq('lead_tier', tier)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    // Column order: Identity → Host → Property → Pricing → Reviews → Quality → Calculated → AI Analysis → Pipeline
    const headers = [
      // Identity
      'Listing ID',
      'Title',
      'URL',
      'Collection Source',
      'Created At',

      // Host
      'Host Name',
      'Host ID',
      'Host Listing Count',
      'Host Type',
      'Superhost',
      'Host Response Rate',
      'Host Response Time',
      'Host Join Date',
      'Host Profile URL',

      // Property
      'City',
      'State',
      'Country',
      'Neighborhood',
      'Latitude',
      'Longitude',
      'Property Type',
      'Room Type',
      'Bedrooms',
      'Bathrooms',
      'Max Guests',
      'Amenities Count',
      'Photo Count',
      'Title Length',
      'Description Length',

      // Pricing
      'Nightly Rate',
      'Cleaning Fee',
      'Minimum Stay',
      'Maximum Stay',
      'Instant Book',
      'Calendar Availability 365',

      // Reviews
      'Avg Rating',
      'Total Reviews',
      'Reviews Per Month',
      'Last Review Date',
      'Rating Cleanliness',
      'Rating Accuracy',
      'Rating Communication',
      'Rating Location',
      'Rating Checkin',
      'Rating Value',

      // Performance
      'Occupancy Rate',
      'Annual Revenue',
      'Monthly Revenue',

      // Market Comparison
      'Market Avg Price',
      'Market Avg Occupancy',
      'Market Avg Revenue',

      // Calculated Scores
      'Revenue Potential Score',
      'Pricing Opportunity Score',
      'Listing Quality Score',
      'Review Momentum Score',
      'Competition Pressure Score',
      'Lead Tier',

      // AI Analysis
      'AI Lead Score',
      'AI Bucket',
      'Opportunity Notes',
      'Outreach Angle',
      'AI Confidence',
      'AI Analyzed At',

      // Pipeline
      'Lead Status',
      'Date Contacted',
      'Contact Method',
      'Follow Up Date',
      'Outreach Notes',
      'Deal Value Estimate',
      'Contact Email',
      'Contact Phone',
      'Contact Source',
      'Host Instagram',
      'Host LinkedIn',
      'Host Company Name',
      'Property Management Company',
    ]

    type ListingRow = Record<string, unknown>

    const rows = (listings || []).map((l: ListingRow) => [
      // Identity
      l.listing_id,
      escapeCsvValue(l.listing_title as string),
      l.listing_url,
      l.collection_source,
      formatDate(l.created_at as string),

      // Host
      escapeCsvValue((l.host_name as string) || ''),
      l.host_id || '',
      l.host_listing_count ?? '',
      l.host_type || '',
      l.superhost ? 'Yes' : 'No',
      l.host_response_rate ?? '',
      l.host_response_time || '',
      formatDate(l.host_join_date as string),
      l.host_profile_url || '',

      // Property
      escapeCsvValue((l.city as string) || ''),
      l.state || '',
      l.country || '',
      escapeCsvValue((l.neighborhood as string) || ''),
      l.latitude ?? '',
      l.longitude ?? '',
      l.property_type || '',
      l.room_type || '',
      l.bedrooms ?? '',
      l.bathrooms ?? '',
      l.max_guests ?? '',
      l.amenities_count ?? '',
      l.photo_count ?? '',
      l.title_length ?? '',
      l.description_length ?? '',

      // Pricing
      l.nightly_rate ?? '',
      l.cleaning_fee ?? '',
      l.minimum_stay ?? '',
      l.maximum_stay ?? '',
      l.instant_book != null ? (l.instant_book ? 'Yes' : 'No') : '',
      l.calendar_availability_365 ?? '',

      // Reviews
      l.avg_rating ?? '',
      l.total_reviews ?? '',
      l.reviews_per_month ?? '',
      formatDate(l.last_review_date as string),
      l.rating_cleanliness ?? '',
      l.rating_accuracy ?? '',
      l.rating_communication ?? '',
      l.rating_location ?? '',
      l.rating_checkin ?? '',
      l.rating_value ?? '',

      // Performance
      l.occupancy_rate ?? '',
      l.annual_revenue ?? '',
      l.estimated_monthly_revenue ?? '',

      // Market
      l.market_avg_price ?? '',
      l.market_avg_occupancy ?? '',
      l.market_avg_revenue ?? '',

      // Calculated
      l.revenue_potential_score ?? '',
      l.pricing_opportunity_score ?? '',
      l.listing_quality_score ?? '',
      l.review_momentum_score ?? '',
      l.competition_pressure_score ?? '',
      l.lead_tier || '',

      // AI Analysis
      l.ai_lead_score ?? '',
      l.ai_bucket || '',
      escapeCsvValue((l.opportunity_notes as string) || ''),
      escapeCsvValue((l.outreach_angle as string) || ''),
      l.ai_confidence ?? '',
      l.ai_analyzed_at ? formatDate(l.ai_analyzed_at as string) : '',

      // Pipeline
      l.lead_status || 'new',
      formatDate(l.date_contacted as string),
      l.contact_method || '',
      formatDate(l.follow_up_date as string),
      escapeCsvValue((l.outreach_notes as string) || ''),
      l.deal_value_estimate ?? '',
      l.contact_email || '',
      l.contact_phone || '',
      l.contact_source || '',
      l.host_instagram || '',
      l.host_linkedin || '',
      escapeCsvValue((l.host_company_name as string) || ''),
      escapeCsvValue((l.property_management_company as string) || ''),
    ])

    const csv = [
      headers.join(','),
      ...rows.map((row: (string | number | boolean | null | undefined)[]) =>
        row.map(v => (v === null || v === undefined ? '' : String(v))).join(',')
      ),
    ].join('\n')

    const filename = `${(campaign.name as string).replace(/[^a-zA-Z0-9]/g, '_')}_${tier || 'all'}_${new Date().toISOString().split('T')[0]}.csv`

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
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function formatDate(isoString: string): string {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
  } catch {
    return ''
  }
}
