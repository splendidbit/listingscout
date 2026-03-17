import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { scoreListing, ListingData } from '@/lib/scoring/engine'
import { getMarketSummary } from '@/lib/airroi/client'

interface MarketData {
  avg_occupancy: number | null
  avg_revpar: number | null
  avg_adr: number | null
  avg_revenue: number | null
}

async function fetchMarketData(
  listings: Array<{ city?: string | null; state?: string | null; country?: string | null }>
): Promise<Map<string, MarketData>> {
  const map = new Map<string, MarketData>()
  const nullEntry: MarketData = { avg_occupancy: null, avg_revpar: null, avg_adr: null, avg_revenue: null }

  if (!process.env.AIRROI_API_KEY) {
    return map
  }

  // Collect unique city|state pairs and their country
  const uniqueMarkets = new Map<string, string>()
  for (const l of listings) {
    if (l.city && l.state) {
      const key = `${l.city}|${l.state}`
      if (!uniqueMarkets.has(key)) {
        uniqueMarkets.set(key, l.country ?? 'US')
      }
    }
  }

  // Fetch all markets in parallel
  const entries = Array.from(uniqueMarkets.entries())
  const results = await Promise.allSettled(
    entries.map(async ([key, country]) => {
      const [city, state] = key.split('|')
      const summary = await getMarketSummary({
        market: { country, region: state, locality: city },
      })
      return {
        key,
        data: {
          avg_occupancy: summary.occupancy ?? null,
          avg_revpar: summary.rev_par ?? null,
          avg_adr: summary.average_daily_rate ?? null,
          avg_revenue: summary.revenue ?? null,
        } as MarketData,
      }
    })
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      map.set(result.value.key, result.value.data)
    } else {
      // Find the key for this failed entry by index
      const idx = results.indexOf(result)
      map.set(entries[idx][0], nullEntry)
    }
  }

  return map
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId, listingIds, rescore = false } = body as {
      campaignId: string
      listingIds?: string[]
      rescore?: boolean
    }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Verify campaign ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Build query for listings to score
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('listings')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('status', 'active')

    if (listingIds && listingIds.length > 0) {
      query = query.in('id', listingIds)
    } else if (!rescore) {
      query = query.is('lead_score', null)
    }

    const { data: listings, error: listingsError } = await query

    if (listingsError) {
      return NextResponse.json({ error: listingsError.message }, { status: 500 })
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ scored: 0, message: 'No listings to score' })
    }

    // Fetch market data for all unique city+state combos
    const marketMap = await fetchMarketData(listings)

    let scoredCount = 0
    const errors: string[] = []

    for (const listing of listings) {
      try {
        const marketKey = listing.city && listing.state ? `${listing.city}|${listing.state}` : null
        const market = marketKey ? marketMap.get(marketKey) : undefined

        const listingData: ListingData = {
          ...listing,
          professional_management: listing.professional_management ?? false,
          cohost_presence: listing.cohost_presence ?? false,
          // Inject live market data (overrides any stale values on the row)
          market_avg_occupancy: market?.avg_occupancy ?? null,
          market_avg_revenue: market?.avg_revenue ?? null,
          market_avg_revpar: market?.avg_revpar ?? null,
          market_avg_adr: market?.avg_adr ?? null,
        }

        const result = scoreListing(listingData)

        // Only update columns that exist in the DB schema.
        // All rich scoring data lives in score_breakdown (Json column).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateError } = await (supabase as any)
          .from('listings')
          .update({
            lead_score: result.opportunity_score,
            lead_tier: result.lead_tier,
            score_breakdown: result,
            scored_at: new Date().toISOString(),
          })
          .eq('id', listing.id)

        if (updateError) {
          errors.push(`Failed to update ${listing.listing_id}: ${updateError.message}`)
        } else {
          scoredCount++
        }
      } catch (err) {
        errors.push(`Error scoring ${listing.listing_id}: ${err}`)
      }
    }

    // Update campaign stats
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: allListings } = await (supabase as any)
        .from('listings').select('lead_tier').eq('campaign_id', campaignId).eq('status', 'active')
      const rows = allListings ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('campaigns').update({
        total_listings: rows.length,
        strong_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'strong').length,
        moderate_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'moderate').length,
        weak_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'weak').length,
      }).eq('id', campaignId)
    } catch {
      // Non-fatal
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaignId,
      action: rescore ? 'listings_rescored' : 'listings_scored',
      entity_type: 'listing',
      details: { scored: scoredCount, errors: errors.length, rescore },
    })

    return NextResponse.json({
      scored: scoredCount,
      total: listings.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('Error in POST /api/scoring:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
