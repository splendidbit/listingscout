'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { z } from 'zod'
import { metroFormSchema, type MetroFormInput } from '@/lib/metros/schema'
import { createMetro, updateMetro } from '@/lib/metros/actions'

type MetroFormValues = z.input<typeof metroFormSchema>
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface MetroFormProps {
  mode: 'create' | 'edit'
  metroId?: string
  defaultValues?: Partial<MetroFormInput>
}

export function MetroForm({ mode, metroId, defaultValues }: MetroFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MetroFormValues>({
    resolver: zodResolver(metroFormSchema),
    defaultValues: {
      name: '',
      slug: '',
      state: '',
      country: 'US',
      airroi_market_id: '',
      airdna_market_id: '',
      crawl_enabled: false,
      crawl_cron: '0 7 * * *',
      airbnb_search_config: {},
      ...defaultValues,
    },
  })

  const onSubmit = (input: MetroFormValues) => {
    setServerError(null)
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createMetro(input as MetroFormInput)
          : await updateMetro(metroId!, input as MetroFormInput)

      if (result.status === 'success') {
        toast.success(mode === 'create' ? 'Metro created' : 'Metro updated')
        router.push(`/metros/${result.id}`)
      } else if (result.status === 'error') {
        setServerError(result.message)
        toast.error(result.message)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} placeholder="Scottsdale" />
        {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
      </div>

      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" {...register('slug')} placeholder="scottsdale-az" />
        {errors.slug && <p className="text-sm text-red-500">{errors.slug.message}</p>}
      </div>

      <div>
        <Label htmlFor="state">State (2 letters)</Label>
        <Input id="state" {...register('state')} placeholder="AZ" maxLength={2} />
        {errors.state && <p className="text-sm text-red-500">{errors.state.message}</p>}
      </div>

      <div>
        <Label htmlFor="airroi_market_id">AirROI Market ID (optional)</Label>
        <Input id="airroi_market_id" {...register('airroi_market_id')} />
      </div>

      <div>
        <Label htmlFor="airdna_market_id">AirDNA Market ID (optional)</Label>
        <Input id="airdna_market_id" {...register('airdna_market_id')} />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="crawl_enabled"
          type="checkbox"
          {...register('crawl_enabled')}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="crawl_enabled">Crawl enabled</Label>
      </div>

      <div>
        <Label htmlFor="crawl_cron">Crawl cron</Label>
        <Input id="crawl_cron" {...register('crawl_cron')} placeholder="0 7 * * *" />
      </div>

      {serverError && (
        <div className="rounded border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-600">
          {serverError}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : mode === 'create' ? 'Create metro' : 'Save changes'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
