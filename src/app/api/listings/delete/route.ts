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
      // Verify campaign ownership first
      const { data: campaign } = await supabaseAny
        .from('campaigns').select('id').eq('id', campaignId).eq('user_id', user.id).single()
      if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

      const { error } = await supabaseAny.from('listings').delete().eq('campaign_id', campaignId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ deleted: 'all' })
    }

    if (listingIds?.length) {
      const { error } = await supabaseAny
        .from('listings')
        .delete()
        .in('id', listingIds)
        .eq('user_id', user.id) // RLS: only own listings
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ deleted: listingIds.length })
    }

    return NextResponse.json({ error: 'Provide listingIds or deleteAll+campaignId' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Delete failed' }, { status: 500 })
  }
}
