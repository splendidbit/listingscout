import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/layout/header"
import { ListingsTable, ListingRow } from "@/components/listings/listings-table"
import { Target, Flame, TrendingUp } from "lucide-react"
import { Database } from "@/types/database"

type ListingDbRow = Database["public"]["Tables"]["listings"]["Row"]

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: listings } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .in("lead_tier", ["strong", "moderate"])
    .order("lead_score", { ascending: false, nullsFirst: false })
    .limit(200)

  const mapRow = (l: ListingDbRow): ListingRow => {
    const sb = (l.score_breakdown as Record<string, unknown> | null) ?? {}
    const priority = (sb.lead_priority_rank as string) ?? null
    const tier = l.lead_tier
    // Treat "strong" tier or "hot" priority as hot leads
    const effectivePriority = priority === "hot" || tier === "strong" ? "hot"
      : priority === "warm" || tier === "moderate" ? "warm"
      : priority ?? tier ?? "cold"
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

  const allLeads = (listings ?? []).map(mapRow)
  const hotLeads = allLeads.filter(l => l.lead_priority_rank === "hot")
  const warmLeads = allLeads.filter(l => l.lead_priority_rank === "warm" || l.lead_priority_rank === "cold")

  return (
    <div className="min-h-screen">
      <Header
        title="Leads"
        description={`${allLeads.length} leads across all campaigns`}
      />
      <div className="p-6 space-y-8">
        {allLeads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Target className="h-12 w-12 text-[#7A7A90] mb-4" />
            <h3 className="text-lg font-medium text-[#EEEEF4] mb-2">No leads yet</h3>
            <p className="text-sm text-[#B0B0C0] max-w-md">
              Score listings in your campaigns to surface leads here. Hot leads have opportunity scores ≥70. Warm leads are 45–69.
            </p>
          </div>
        ) : (
          <>
            {hotLeads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-red-400" />
                  <h2 className="text-sm font-semibold text-[#EEEEF4] uppercase tracking-wide">Hot Leads</h2>
                  <span className="text-xs bg-red-500/15 text-red-400 border border-red-500/30 px-2 py-0.5 rounded font-mono">{hotLeads.length}</span>
                </div>
                <ListingsTable data={hotLeads} />
              </div>
            )}
            {warmLeads.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-400" />
                  <h2 className="text-sm font-semibold text-[#EEEEF4] uppercase tracking-wide">Warm Leads</h2>
                  <span className="text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 px-2 py-0.5 rounded font-mono">{warmLeads.length}</span>
                </div>
                <ListingsTable data={warmLeads} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
