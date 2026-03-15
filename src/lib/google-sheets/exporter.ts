/**
 * Google Sheets Campaign Exporter
 * Exports campaign listings with full enriched data, formatting, and color-coding.
 */

import { GoogleSheetsClient } from './client'
import { createClient } from '@/lib/supabase/server'

type CellValue = string | number | boolean | null

interface ListingRow {
  listing_id: string
  listing_title: string
  listing_url: string
  collection_source: string
  created_at: string
  host_name: string | null
  host_id: string | null
  host_listing_count: number | null
  host_type: string | null
  superhost: boolean
  host_response_rate: number | null
  host_response_time: string | null
  host_join_date: string | null
  host_profile_url: string | null
  city: string
  state: string
  country: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  property_type: string
  room_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  amenities_count: number | null
  photo_count: number | null
  title_length: number | null
  description_length: number | null
  nightly_rate: number | null
  cleaning_fee: number | null
  minimum_stay: number | null
  maximum_stay: number | null
  instant_book: boolean | null
  calendar_availability_365: number | null
  avg_rating: number | null
  total_reviews: number | null
  reviews_per_month: number | null
  last_review_date: string | null
  rating_cleanliness: number | null
  rating_accuracy: number | null
  rating_communication: number | null
  rating_location: number | null
  rating_checkin: number | null
  rating_value: number | null
  occupancy_rate: number | null
  annual_revenue: number | null
  estimated_monthly_revenue: number | null
  market_avg_price: number | null
  market_avg_occupancy: number | null
  market_avg_revenue: number | null
  revenue_potential_score: number | null
  pricing_opportunity_score: number | null
  listing_quality_score: number | null
  review_momentum_score: number | null
  competition_pressure_score: number | null
  lead_tier: string | null
  ai_lead_score: number | null
  ai_bucket: string | null
  opportunity_notes: string | null
  outreach_angle: string | null
  ai_confidence: number | null
  ai_analyzed_at: string | null
  lead_status: string | null
  date_contacted: string | null
  contact_method: string | null
  follow_up_date: string | null
  outreach_notes: string | null
  deal_value_estimate: number | null
  contact_email: string | null
  contact_phone: string | null
  contact_source: string | null
  host_instagram: string | null
  host_linkedin: string | null
  host_company_name: string | null
  property_management_company: string | null
}

// ─── Column Headers ───────────────────────────────────────────────────────────

const HEADERS: string[] = [
  // Identity
  'Listing ID', 'Title', 'URL', 'Collection Source', 'Created At',
  // Host
  'Host Name', 'Host ID', 'Host Listing Count', 'Host Type', 'Superhost',
  'Host Response Rate', 'Host Response Time', 'Host Join Date', 'Host Profile URL',
  // Property
  'City', 'State', 'Country', 'Neighborhood', 'Latitude', 'Longitude',
  'Property Type', 'Room Type', 'Bedrooms', 'Bathrooms', 'Max Guests',
  'Amenities Count', 'Photo Count', 'Title Length', 'Description Length',
  // Pricing
  'Nightly Rate', 'Cleaning Fee', 'Minimum Stay', 'Maximum Stay',
  'Instant Book', 'Calendar Availability 365',
  // Reviews
  'Avg Rating', 'Total Reviews', 'Reviews Per Month', 'Last Review Date',
  'Rating Cleanliness', 'Rating Accuracy', 'Rating Communication',
  'Rating Location', 'Rating Checkin', 'Rating Value',
  // Performance
  'Occupancy Rate', 'Annual Revenue', 'Monthly Revenue',
  // Market
  'Market Avg Price', 'Market Avg Occupancy', 'Market Avg Revenue',
  // Calculated Scores
  'Revenue Potential Score', 'Pricing Opportunity Score', 'Listing Quality Score',
  'Review Momentum Score', 'Competition Pressure Score', 'Lead Tier',
  // AI Analysis
  'AI Lead Score', 'AI Bucket', 'Opportunity Notes', 'Outreach Angle',
  'AI Confidence', 'AI Analyzed At',
  // Pipeline
  'Lead Status', 'Date Contacted', 'Contact Method', 'Follow Up Date',
  'Outreach Notes', 'Deal Value Estimate', 'Contact Email', 'Contact Phone',
  'Contact Source', 'Host Instagram', 'Host LinkedIn',
  'Host Company Name', 'Property Management Company',
]

// ─── Row Conversion ───────────────────────────────────────────────────────────

function listingToRow(l: ListingRow): CellValue[] {
  return [
    // Identity
    l.listing_id, l.listing_title, l.listing_url, l.collection_source,
    formatDate(l.created_at),
    // Host
    l.host_name ?? '', l.host_id ?? '', l.host_listing_count ?? '',
    l.host_type ?? '', l.superhost ? 'Yes' : 'No',
    l.host_response_rate ?? '', l.host_response_time ?? '',
    formatDate(l.host_join_date), l.host_profile_url ?? '',
    // Property
    l.city, l.state, l.country ?? '', l.neighborhood ?? '',
    l.latitude ?? '', l.longitude ?? '',
    l.property_type, l.room_type, l.bedrooms, l.bathrooms, l.max_guests,
    l.amenities_count ?? '', l.photo_count ?? '',
    l.title_length ?? '', l.description_length ?? '',
    // Pricing
    l.nightly_rate ?? '', l.cleaning_fee ?? '',
    l.minimum_stay ?? '', l.maximum_stay ?? '',
    l.instant_book != null ? (l.instant_book ? 'Yes' : 'No') : '',
    l.calendar_availability_365 ?? '',
    // Reviews
    l.avg_rating ?? '', l.total_reviews ?? '', l.reviews_per_month ?? '',
    formatDate(l.last_review_date),
    l.rating_cleanliness ?? '', l.rating_accuracy ?? '',
    l.rating_communication ?? '', l.rating_location ?? '',
    l.rating_checkin ?? '', l.rating_value ?? '',
    // Performance
    l.occupancy_rate ?? '', l.annual_revenue ?? '',
    l.estimated_monthly_revenue ?? '',
    // Market
    l.market_avg_price ?? '', l.market_avg_occupancy ?? '',
    l.market_avg_revenue ?? '',
    // Calculated
    l.revenue_potential_score ?? '', l.pricing_opportunity_score ?? '',
    l.listing_quality_score ?? '', l.review_momentum_score ?? '',
    l.competition_pressure_score ?? '', l.lead_tier ?? '',
    // AI
    l.ai_lead_score ?? '', l.ai_bucket ?? '',
    l.opportunity_notes ?? '', l.outreach_angle ?? '',
    l.ai_confidence ?? '', formatDate(l.ai_analyzed_at),
    // Pipeline
    l.lead_status ?? 'new', formatDate(l.date_contacted),
    l.contact_method ?? '', formatDate(l.follow_up_date),
    l.outreach_notes ?? '', l.deal_value_estimate ?? '',
    l.contact_email ?? '', l.contact_phone ?? '', l.contact_source ?? '',
    l.host_instagram ?? '', l.host_linkedin ?? '',
    l.host_company_name ?? '', l.property_management_company ?? '',
  ]
}

function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  try {
    return new Date(value).toLocaleDateString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    })
  } catch {
    return ''
  }
}

// ─── Color coding ─────────────────────────────────────────────────────────────

interface RGBColor { red: number; green: number; blue: number }

function getRowColor(listing: ListingRow): RGBColor | null {
  const bucket = listing.ai_bucket ?? listing.lead_tier ?? ''
  const tier = listing.lead_tier ?? ''

  if (bucket === 'strong_lead' || tier === 'strong') {
    return { red: 0.85, green: 0.95, blue: 0.85 } // light green
  }
  if (bucket === 'pricing_opportunity') {
    return { red: 0.99, green: 0.98, blue: 0.78 } // light yellow
  }
  if (bucket === 'optimization_opportunity' || bucket === 'multi_listing_host') {
    return { red: 0.99, green: 0.90, blue: 0.75 } // light orange
  }
  if (bucket === 'weak_lead' || tier === 'weak') {
    return { red: 0.99, green: 0.85, blue: 0.83 } // light red
  }
  return null
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export interface ExportResult {
  rowsWritten: number
  spreadsheetUrl: string
  sheetTitle: string
}

/**
 * Export a campaign's listings to a Google Sheets spreadsheet.
 * Creates/updates a tab named after the campaign.
 * Formats headers bold, color-codes rows by lead quality, sorts by ai_lead_score.
 */
export async function exportCampaignToSheets(
  campaignId: string,
  sheetsId: string,
  accessToken: string
): Promise<ExportResult> {
  const supabase = await createClient()

  // Verify campaign ownership
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign } = await (supabase as any)
    .from('campaigns')
    .select('id, name')
    .eq('id', campaignId)
    .single()

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  // Fetch all active listings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: listings, error } = await (supabase as any)
    .from('listings')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')
    .order('ai_lead_score', { ascending: false, nullsFirst: false })

  if (error) throw new Error(error.message)

  const typedListings = (listings ?? []) as ListingRow[]

  // Sort: ai_lead_score desc, then revenue_potential_score desc
  typedListings.sort((a, b) => {
    const aScore = a.ai_lead_score ?? 0
    const bScore = b.ai_lead_score ?? 0
    if (bScore !== aScore) return bScore - aScore
    return (b.revenue_potential_score ?? 0) - (a.revenue_potential_score ?? 0)
  })

  const client = new GoogleSheetsClient({ spreadsheetId: sheetsId, accessToken })

  // Get existing sheets
  const spreadsheet = await client.getSpreadsheet()
  const sheetTitle = `${campaign.name as string}`.substring(0, 100)
  const existingSheet = spreadsheet.sheets.find(s => s.title === sheetTitle)

  let sheetId: number

  if (existingSheet) {
    sheetId = existingSheet.index
    // Clear existing data
    await client.clearRange(`${sheetTitle}!A:ZZ`)
  } else {
    sheetId = await client.createSheet(sheetTitle)
  }

  // Write header row
  await client.writeRange(`${sheetTitle}!A1`, [HEADERS])

  // Write data rows
  if (typedListings.length > 0) {
    const rows = typedListings.map(listingToRow)
    await client.writeRange(`${sheetTitle}!A2`, rows)
  }

  // Format headers bold + frozen
  await client.formatHeaders(sheetId)

  // Color-code data rows
  const colorRequests: unknown[] = []
  typedListings.forEach((listing, index) => {
    const color = getRowColor(listing)
    if (!color) return

    colorRequests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: index + 1, // +1 for header
          endRowIndex: index + 2,
          startColumnIndex: 0,
          endColumnIndex: HEADERS.length,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: color,
          },
        },
        fields: 'userEnteredFormat.backgroundColor',
      },
    })
  })

  if (colorRequests.length > 0) {
    // Apply color formatting in batches of 50 to avoid payload limits
    for (let i = 0; i < colorRequests.length; i += 50) {
      const batch = colorRequests.slice(i, i + 50)
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetsId}:batchUpdate`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests: batch }),
        }
      )
    }
  }

  return {
    rowsWritten: typedListings.length,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetsId}`,
    sheetTitle,
  }
}
