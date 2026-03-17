import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { listingId, favorited } = await request.json() as {
      listingId: string
      favorited: boolean
    }

    if (!listingId || typeof favorited !== 'boolean') {
      return NextResponse.json({ error: 'listingId and favorited (boolean) are required' }, { status: 400 })
    }

    // Verify ownership: listing must belong to a campaign owned by this user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .select('id, campaign_id')
      .eq('id', listingId)
      .single()

    if (listingError || !listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id')
      .eq('id', listing.campaign_id)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Toggle the favorite
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('listings')
      .update({ is_favorited: favorited })
      .eq('id', listingId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ success: true, is_favorited: favorited })
  } catch (error) {
    console.error('Favorite toggle error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to toggle favorite' },
      { status: 500 }
    )
  }
}
