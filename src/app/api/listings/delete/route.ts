import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { listingIds, campaignId, deleteAll } = body as {
      listingIds?: string[]
      campaignId?: string
      deleteAll?: boolean
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabaseAny = supabase as any

    if (deleteAll && campaignId) {
      const { data: campaign } = await supabaseAny
        .from('campaigns').select('id').eq('id', campaignId).eq('user_id', user.id).single()
      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

      const { error } = await supabaseAny.from('listings').delete().eq('campaign_id', campaignId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Reset campaign counters
      await supabaseAny.from('campaigns').update({
        total_listings: 0, strong_leads: 0, moderate_leads: 0, weak_leads: 0, owners_found: 0,
      }).eq('id', campaignId)

      return NextResponse.json({ deleted: 'all' })
    }

    if (listingIds?.length) {
      // Get campaign_id before deleting (need it to update counters)
      const { data: toDelete } = await supabaseAny
        .from('listings').select('id, campaign_id, lead_tier').in('id', listingIds).eq('user_id', user.id)

      const { error } = await supabaseAny
        .from('listings').delete().in('id', listingIds).eq('user_id', user.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Recalculate campaign counters for affected campaigns
      const affectedCampaigns = [...new Set((toDelete ?? []).map((l: {campaign_id: string}) => l.campaign_id))]
      for (const cid of affectedCampaigns) {
        const { data: remaining } = await supabaseAny
          .from('listings').select('lead_tier').eq('campaign_id', cid)
        const rows = remaining ?? []
        await supabaseAny.from('campaigns').update({
          total_listings: rows.length,
          strong_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'strong').length,
          moderate_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'moderate').length,
          weak_leads: rows.filter((r: {lead_tier: string}) => r.lead_tier === 'weak').length,
        }).eq('id', cid)
      }

      return NextResponse.json({ deleted: (toDelete ?? []).length })
    }

    return NextResponse.json({ error: 'Provide listingIds or deleteAll+campaignId' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed' }, { status: 500 })
  }
}
