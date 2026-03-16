import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable } from '@/components/listings/listings-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Archive, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'
import { mapListingRows } from '@/lib/listings/map-listing-row'

interface WeakPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignWeakPage({ params }: WeakPageProps) {
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
    .eq('lead_tier', 'weak')
    .order('lead_score', { ascending: false, nullsFirst: false })

  const listingData = mapListingRows(
    (listings || []) as Database['public']['Tables']['listings']['Row'][]
  )

  return (
    <div className="min-h-screen">
      <Header
        title={`${campaign.name} — Weak Leads`}
        description={`${listingData.length} low-scoring listings filtered out`}
      />

      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/campaigns/${id}`}
            className="text-sm text-[#6366F1] hover:text-[#818CF8]"
          >
            ← Back to campaign
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled title="Coming soon">
              <Archive className="h-4 w-4 mr-2" />
              Archive All
            </Button>
            <Button variant="destructive" size="sm" disabled title="Coming soon">
              <Trash2 className="h-4 w-4 mr-2" />
              Remove All
            </Button>
          </div>
        </div>

        <Card className="bg-[#EF4444]/5 border-[#EF4444]/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#EF4444]/10">
              <AlertCircle className="h-6 w-6 text-[#EF4444]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#f0f0f6]">{listingData.length} Weak Leads</p>
              <p className="text-base text-[#c4c5d6]">
                These listings scored below 40 and don&apos;t match your criteria well
              </p>
            </div>
          </CardContent>
        </Card>

        {listingData.length > 0 ? (
          <ListingsTable data={listingData} />
        ) : (
          <Card className="bg-[#13141c] border-[#363a4f]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-[#9395a8] mb-4" />
              <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
                No weak leads
              </h3>
              <p className="text-base text-[#c4c5d6] text-center max-w-md">
                All your scored listings are above the weak threshold. Great news!
              </p>
              <Link href={`/campaigns/${id}/listings`}>
                <Button className="mt-4 bg-[#6366F1] hover:bg-[#818CF8]">
                  View All Listings
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
