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
      if (error) {
        console.error('Error deleting all listings:', error)
        return NextResponse.json({ error: 'Failed to delete listings' }, { status: 500 })
      }

      // Reset campaign counters via RPC
      await supabaseAny.rpc('refresh_campaign_stats', { p_campaign_id: campaignId })

      return NextResponse.json({ deleted: 'all' })
    }

    if (listingIds && listingIds.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 listing IDs per request' }, { status: 400 })
    }

    if (listingIds?.length) {
      // Get campaign_id before deleting (need it to update counters)
      const { data: toDelete } = await supabaseAny
        .from('listings').select('id, campaign_id, lead_tier').in('id', listingIds).eq('user_id', user.id)

      const { error } = await supabaseAny
        .from('listings').delete().in('id', listingIds).eq('user_id', user.id)
      if (error) {
        console.error('Error deleting listings:', error)
        return NextResponse.json({ error: 'Failed to delete listings' }, { status: 500 })
      }

      // Refresh campaign stats via RPC (atomic, avoids race conditions)
      const affectedCampaigns = [...new Set((toDelete ?? []).map((l: {campaign_id: string}) => l.campaign_id))]
      for (const cid of affectedCampaigns) {
        await supabaseAny.rpc('refresh_campaign_stats', { p_campaign_id: cid })
      }

      return NextResponse.json({ deleted: (toDelete ?? []).length })
    }

    return NextResponse.json({ error: 'Provide listingIds or deleteAll+campaignId' }, { status: 400 })
  } catch (error) {
    console.error('Error in POST /api/listings/delete:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
