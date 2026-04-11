'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendEvent } from '@/lib/inngest/client'
import { metroFormSchema, type MetroFormInput } from './schema'
import type { Json } from '@/types/database'

export type MetroActionState =
  | { status: 'idle' }
  | { status: 'error'; message: string; fieldErrors?: Record<string, string[]> }
  | { status: 'success'; id: string }

async function getUserId(): Promise<string> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return user.id
}

export async function createMetro(input: MetroFormInput): Promise<MetroActionState> {
  const parsed = metroFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Invalid input',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const supabase = await createClient()
    const userId = await getUserId()

    const { data, error } = await supabase
      .from('metros')
      .insert({
        user_id: userId,
        ...parsed.data,
        airbnb_search_config: parsed.data.airbnb_search_config as Json,
      })
      .select('id')
      .single()

    if (error) {
      return { status: 'error', message: error.message }
    }

    revalidatePath('/metros')
    return { status: 'success', id: data.id }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateMetro(id: string, input: MetroFormInput): Promise<MetroActionState> {
  const parsed = metroFormSchema.safeParse(input)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Invalid input',
      fieldErrors: parsed.error.flatten().fieldErrors,
    }
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('metros')
      .update({
        ...parsed.data,
        airbnb_search_config: parsed.data.airbnb_search_config as Json,
      })
      .eq('id', id)

    if (error) {
      return { status: 'error', message: error.message }
    }

    revalidatePath('/metros')
    revalidatePath(`/metros/${id}`)
    return { status: 'success', id }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteMetro(id: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('metros').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/metros')
  redirect('/metros')
}

export async function triggerMetroPing(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const supabase = await createClient()
    const userId = await getUserId()

    const { data: metro, error } = await supabase
      .from('metros')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (error || !metro) {
      return { ok: false, error: 'Metro not found' }
    }

    await sendEvent('metros/ping.requested', { metroId: metro.id, userId })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
