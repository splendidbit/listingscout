import { z } from 'zod'

export const metroFormSchema = z.object({
  name: z.string().min(1, 'Required').max(100),
  slug: z
    .string()
    .min(1, 'Required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, and hyphens only'),
  state: z.string().length(2, 'Two-letter state code').toUpperCase(),
  country: z.string().length(2).default('US'),
  airroi_market_id: z.string().optional().nullable(),
  airdna_market_id: z.string().optional().nullable(),
  crawl_enabled: z.boolean().default(false),
  crawl_cron: z.string().default('0 7 * * *'),
  airbnb_search_config: z.record(z.string(), z.unknown()).default({}),
})

export type MetroFormInput = z.infer<typeof metroFormSchema>
