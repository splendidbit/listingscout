'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { CampaignCriteria } from '@/lib/types/criteria'

export interface CreateCampaignInput {
  name: string
  description?: string
  criteria: CampaignCriteria
}

export interface UpdateCampaignInput {
  id: string
  name?: string
  description?: string
  status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  criteria?: CampaignCriteria
  google_sheet_id?: string | null
  sheets_sync_enabled?: boolean
}

export async function createCampaign(input: CreateCampaignInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error } = await (supabase as any)
    .from('campaigns')
    .insert({
      user_id: user.id,
      name: input.name,
      description: input.description || null,
      criteria: input.criteria,
      status: 'active',
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating campaign:', error)
    return { error: error.message }
  }

  // Create audit log entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    campaign_id: campaign.id,
    action: 'campaign_created',
    entity_type: 'campaign',
    entity_id: campaign.id,
    details: { name: input.name },
    new_value: campaign,
  })

  revalidatePath('/campaigns')
  return { campaignId: campaign.id }
}

export async function updateCampaign(input: UpdateCampaignInput) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Get current campaign for audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentCampaign } = await (supabase as any)
    .from('campaigns')
    .select()
    .eq('id', input.id)
    .eq('user_id', user.id)
    .single()

  if (!currentCampaign) {
    return { error: 'Campaign not found' }
  }

  const updates: Record<string, unknown> = {}
  if (input.name !== undefined) updates.name = input.name
  if (input.description !== undefined) updates.description = input.description
  if (input.status !== undefined) updates.status = input.status
  if (input.criteria !== undefined) updates.criteria = input.criteria
  if (input.google_sheet_id !== undefined) updates.google_sheet_id = input.google_sheet_id
  if (input.sheets_sync_enabled !== undefined) updates.sheets_sync_enabled = input.sheets_sync_enabled

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error } = await (supabase as any)
    .from('campaigns')
    .update(updates)
    .eq('id', input.id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    console.error('Error updating campaign:', error)
    return { error: error.message }
  }

  // Create audit log entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    campaign_id: campaign.id,
    action: 'campaign_updated',
    entity_type: 'campaign',
    entity_id: campaign.id,
    details: { updated_fields: Object.keys(updates) },
    previous_value: currentCampaign,
    new_value: campaign,
  })

  revalidatePath(`/campaigns/${input.id}`)
  revalidatePath('/campaigns')
  
  return { campaign }
}

export async function deleteCampaign(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // Get campaign for audit
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentCampaign } = await (supabase as any)
    .from('campaigns')
    .select()
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!currentCampaign) {
    return { error: 'Campaign not found' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('campaigns')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting campaign:', error)
    return { error: error.message }
  }

  // Create audit log entry
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('audit_log').insert({
    user_id: user.id,
    action: 'campaign_deleted',
    entity_type: 'campaign',
    entity_id: id,
    details: { name: currentCampaign.name },
    previous_value: currentCampaign,
  })

  revalidatePath('/campaigns')
  redirect('/campaigns')
}

export async function getCampaign(id: string) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaign, error } = await (supabase as any)
    .from('campaigns')
    .select()
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error) {
    return { error: error.message }
  }

  return { campaign }
}

export async function getCampaigns() {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Not authenticated', campaigns: [] }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: campaigns, error } = await (supabase as any)
    .from('campaigns')
    .select()
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) {
    return { error: error.message, campaigns: [] }
  }

  return { campaigns: campaigns || [] }
}
