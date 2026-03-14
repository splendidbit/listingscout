import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { CampaignCriteria } from '@/lib/types/criteria'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, criteria } = body as {
      name: string
      description?: string
      criteria: CampaignCriteria
    }

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaign, error } = await (supabase as any)
      .from('campaigns')
      .insert({
        user_id: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        criteria: criteria,
        status: 'active',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating campaign:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create audit log
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('audit_log').insert({
      user_id: user.id,
      campaign_id: campaign.id,
      action: 'campaign_created',
      entity_type: 'campaign',
      entity_id: campaign.id,
      details: { name },
      new_value: campaign,
    })

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('Error in POST /api/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaigns, error } = await (supabase as any)
      .from('campaigns')
      .select()
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error('Error in GET /api/campaigns:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
