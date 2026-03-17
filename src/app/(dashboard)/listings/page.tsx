import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { ListingsTable, ListingRow } from '@/components/listings/listings-table'
import { Card, CardContent } from '@/components/ui/card'
import { Home } from 'lucide-react'
import { Database } from '@/types/database'

type ListingDbRow = Database['public']['Tables']['listings']['Row']

export default async function ListingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Get all campaign IDs for this user
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id')
    .eq('user_id', user.id)

  const campaignIds = ((campaigns as Array<{ id: string }> | null) ?? []).map(c => c.id)

  // Fetch all active listings for those campaigns
  let listings: ListingDbRow[] = []
  if (campaignIds.length > 0) {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .in('campaign_id', campaignIds)
      .eq('status', 'active')
      .order('lead_score', { ascending: false, nullsFirst: false })
      .limit(500)
    listings = (data ?? []) as ListingDbRow[]
  }

  const mapRow = (l: ListingDbRow): ListingRow => {
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
  }

  const listingData = listings.map(mapRow)

  return (
    <div className="min-h-screen">
      <Header
        title={`All Listings (${listingData.length})`}
        description="View listings across all campaigns"
      />

      <div className="p-6">
        {listingData.length > 0 ? (
          <ListingsTable data={listingData} />
        ) : (
          <Card className="bg-[#13141c] border-[#363a4f]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Home className="h-12 w-12 text-[#9395a8] mb-4" />
              <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
                No listings yet
              </h3>
              <p className="text-base text-[#c4c5d6]">
                Listings will appear here once you add them to campaigns
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
