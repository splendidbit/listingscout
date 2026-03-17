import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable, ListingRow } from '@/components/listings/listings-table'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, FileDown, Mail } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Database } from '@/types/database'

type ListingDbRow = Database['public']['Tables']['listings']['Row']

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

  if (campaignError || !campaignData) {
    notFound()
  }

  const campaign = campaignData as Database['public']['Tables']['campaigns']['Row']

  const { data: listings } = await supabase
    .from('listings')
    .select('*')
    .eq('campaign_id', id)
    .eq('status', 'active')
    .eq('lead_tier', 'strong')
    .order('lead_score', { ascending: false, nullsFirst: false })

  const listingData: ListingRow[] = ((listings || []) as ListingDbRow[]).map((l) => {
    const sb = (l.score_breakdown as Record<string, unknown> | null) ?? {}
    const priority = (sb.lead_priority_rank as string) ?? null
    const tier = l.lead_tier
    const effectivePriority = priority === 'hot' || tier === 'strong' ? 'hot'
      : priority === 'warm' || tier === 'moderate' ? 'warm'
      : priority ?? tier ?? 'cold'
    return {
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
      opportunity_score: (sb.opportunity_score as number) ?? null,
      lead_priority_rank: effectivePriority,
      recommended_outreach_reason: (sb.recommended_outreach_reason as string) ?? null,
      occupancy_gap_score: (sb.occupancy_gap_score as number) ?? null,
      revpan_gap_score: (sb.revpan_gap_score as number) ?? null,
      pricing_inefficiency_score: (sb.pricing_inefficiency_score as number) ?? null,
      listing_quality_gap_score: (sb.listing_quality_gap_score as number) ?? null,
      momentum_score: (sb.momentum_score as number) ?? null,
      host_profile_score: (sb.host_profile_score as number) ?? null,
      occupancy_delta: (sb.occupancy_delta as number) ?? null,
      revpan_delta: (sb.revpan_delta as number) ?? null,
      adr_delta: (sb.adr_delta as number) ?? null,
      momentum_signal: (sb.momentum_signal as number) ?? null,
      estimated_revenue_upside: (sb.estimated_revenue_upside as number) ?? null,
      estimated_upside_pct: (sb.estimated_upside_pct as number) ?? null,
      cohost_presence: (sb.cohost_presence as boolean) ?? false,
      professional_management: (sb.professional_management as boolean) ?? false,
      host_type: (sb.host_type as string) ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      host_listing_count: (l as any).host_listing_count ?? null,
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
      pricing_opportunity_score: (sb.pricing_opportunity_score as number) ?? null,
      listing_quality_score: (sb.listing_quality_score as number) ?? null,
      review_momentum_score: (sb.review_momentum_score as number) ?? null,
      opportunity_notes: (sb.opportunity_notes as string) ?? null,
      outreach_angle: (sb.outreach_angle as string) ?? null,
      ai_lead_score: (sb.ai_lead_score as number) ?? null,
      ai_bucket: (sb.ai_bucket as string) ?? null,
    }
  })

  return (
    <div className="min-h-screen">
      <Header
        title={`${campaign.name} — Hot Leads`}
        description={`${listingData.length} high-scoring listings ready for outreach`}
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
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export Leads
            </Button>
            <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A]">
              <Mail className="h-4 w-4 mr-2" />
              Start Outreach
            </Button>
          </div>
        </div>

        {/* Stats Card */}
        <Card className="bg-[#22C55E]/5 border-[#22C55E]/20">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-full bg-[#22C55E]/10">
              <Star className="h-6 w-6 text-[#22C55E]" />
            </div>
            <div>
              <p className="text-lg font-bold text-[#F0F0F5]">{listingData.length} Hot Leads</p>
              <p className="text-sm text-[#9494A8]">
                These listings scored 70+ and match your criteria well
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {listingData.length > 0 ? (
          <ListingsTable data={listingData} />
        ) : (
          <Card className="bg-[#12121A] border-[#2A2A3C]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Star className="h-12 w-12 text-[#5C5C72] mb-4" />
              <h3 className="text-lg font-medium text-[#F0F0F5] mb-2">
                No hot leads yet
              </h3>
              <p className="text-sm text-[#9494A8] text-center max-w-md">
                Score your listings to identify hot leads. Hot leads are listings
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
