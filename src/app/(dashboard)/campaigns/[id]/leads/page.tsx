import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable } from '@/components/listings/listings-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, FileDown, Mail } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'
import { mapListingRows } from '@/lib/listings/map-listing-row'

interface LeadsPageProps {
  params: Promise<{ id: string }>
}

export default async function CampaignLeadsPage({ params }: LeadsPageProps) {
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
    .eq('lead_tier', 'strong')
    .order('lead_score', { ascending: false, nullsFirst: false })

  const listingData = mapListingRows(
    (listings || []) as Database['public']['Tables']['listings']['Row'][]
  )

  return (
    <div className="min-h-screen">
      <Header
        title={`${campaign.name} — Strong Leads`}
        description={`${listingData.length} high-scoring listings ready for outreach`}
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
              <FileDown className="h-4 w-4 mr-2" />
              Export Leads
            </Button>
            <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A]" disabled title="Coming soon">
              <Mail className="h-4 w-4 mr-2" />
              Start Outreach
            </Button>
          </div>
        </div>

        <Card className="bg-[#22C55E]/5 border-[#22C55E]/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#22C55E]/10">
              <Star className="h-6 w-6 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#f0f0f6]">{listingData.length} Strong Leads</p>
              <p className="text-sm text-[#c4c5d6]">
                These listings scored 70+ and match your criteria well
              </p>
            </div>
          </CardContent>
        </Card>

        {listingData.length > 0 ? (
          <ListingsTable data={listingData} />
        ) : (
          <Card className="bg-[#13141c] border-[#363a4f]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-[#9395a8] mb-4" />
              <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
                No strong leads yet
              </h3>
              <p className="text-sm text-[#c4c5d6] text-center max-w-md">
                Score your listings to identify strong leads. Strong leads are listings
                that score 70 or above based on your criteria.
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
