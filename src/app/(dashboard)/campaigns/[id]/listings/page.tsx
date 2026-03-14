import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable, ListingRow } from '@/components/listings/listings-table'
import { Button } from '@/components/ui/button'
import { Upload, Bot } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'
import { ScoreActions } from '@/components/scoring/score-actions'

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

  if (campaignError || !campaignData) {
    notFound()
  }

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
  }))

  const unscoredCount = listingData.filter(l => l.lead_score === null).length

  return (
    <div className="min-h-screen">
      <Header
        title={`${campaign.name} — Listings`}
        description={`${listingData.length} listings total`}
      />

      <div className="p-6 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <Link
            href={`/campaigns/${id}`}
            className="text-sm text-[#6366F1] hover:text-[#818CF8]"
          >
            ← Back to campaign
          </Link>
          <div className="flex items-center gap-2">
            <ScoreActions 
              campaignId={id} 
              unscoredCount={unscoredCount} 
              totalCount={listingData.length}
            />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
            <Button size="sm" className="bg-[#6366F1] hover:bg-[#818CF8]">
              <Bot className="h-4 w-4 mr-2" />
              Research with AI
            </Button>
          </div>
        </div>

        {/* Table */}
        <ListingsTable data={listingData} />
      </div>
    </div>
  )
}
