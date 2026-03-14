import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { researchListings } from '@/lib/ai/agent'
import { CampaignCriteria } from '@/lib/types/criteria'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaignId } = body as { campaignId: string }

    if (!campaignId) {
      return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 })
    }

    // Get campaign with criteria
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error: campaignError } = await (supabase as any)
      .from('campaigns')
      .select('id, criteria, name')
      .eq('id', campaignId)
      .eq('user_id', user.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const criteria = campaign.criteria as CampaignCriteria

    // Use API key from environment or user settings
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY

    // Run AI research
    const result = await researchListings(criteria, apiKey)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Return listings for review (not auto-inserted)
    // The frontend will display these in a review queue
    return NextResponse.json({
      listings: result.listings,
      count: result.listings?.length || 0,
      campaign: {
        id: campaign.id,
        name: campaign.name,
      },
    })
  } catch (error) {
    console.error('Error in POST /api/ai/agent:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
