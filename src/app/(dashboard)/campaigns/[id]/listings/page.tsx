import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'
import { ListingsPageClient } from '@/components/listings/listings-page-client'
import { mapListingRows } from '@/lib/listings/map-listing-row'

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

  const listingData = mapListingRows(
    (listings || []) as Database['public']['Tables']['listings']['Row'][]
  )
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
