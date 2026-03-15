import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable, ListingRow } from '@/components/listings/listings-table'
import { Button } from '@/components/ui/button'
import { Upload, Bot } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'
import { ScoreActions } from '@/components/scoring/score-actions'
import { ListingsPageClient } from '@/components/listings/listings-page-client'

type ListingDbRow = Database['public']['Tables']['listings']['Row']

interface ListingsPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignListingsPage({ params }: ListingsPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaignData, error: campaignError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (campaignError || !campaignData) notFound()

  const campaign = campaignData as Database['public']['Tables']['campaigns']['Row']

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('campaign_id', id)
    .eq('status', 'active')
    .order('lead_score', { ascending: false, nullsFirst: false })

  const listingData: ListingRow[] = ((listings || []) as ListingDbRow[]).map((l) => ({
    id: l.id,
    listing_id: l.listing_id,
    listing_url: l.listing_url,
    listing_title: l.listing_title,
    city: l.city,
    state: l.state,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    max_guests: l.max_guests,
    nightly_rate: l.nightly_rate,
    avg_rating: l.avg_rating,
    total_reviews: l.total_reviews,
    host_name: l.host_name,
    superhost: l.superhost,
    lead_score: l.lead_score,
    lead_tier: l.lead_tier,
    // Extended fields for detail panel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    host_listing_count: (l as any).host_listing_count ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    host_type: (l as any).host_type ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photo_count: (l as any).photo_count ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    amenities_count: (l as any).amenities_count ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ttm_avg_rate: (l as any).ttm_avg_rate ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ttm_revenue: (l as any).ttm_revenue ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ttm_occupancy: (l as any).ttm_occupancy ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    market_avg_price: (l as any).market_avg_price ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    market_avg_occupancy: (l as any).market_avg_occupancy ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    market_avg_revenue: (l as any).market_avg_revenue ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pricing_opportunity_score: (l as any).pricing_opportunity_score ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    listing_quality_score: (l as any).listing_quality_score ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    review_momentum_score: (l as any).review_momentum_score ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opportunity_notes: (l as any).opportunity_notes ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outreach_angle: (l as any).outreach_angle ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ai_lead_score: (l as any).ai_lead_score ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ai_bucket: (l as any).ai_bucket ?? null,
  }))

  const unscoredCount = listingData.filter(l => l.lead_score === null).length

  return (
    <div className="min-h-screen">
      <Header
        title={`${campaign.name} — Listings`}
        description={`${listingData.length} listings total`}
      />
      <div className="p-6 space-y-6">
        <ListingsPageClient
          campaignId={id}
          listingData={listingData}
          unscoredCount={unscoredCount}
        />
      </div>
    </div>
  )
}
