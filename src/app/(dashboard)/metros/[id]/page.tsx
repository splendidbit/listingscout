import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MetroForm } from '@/components/metros/metro-form'
import { PingButton } from '@/components/metros/ping-button'
import { CrawlRunsTable } from '@/components/metros/crawl-runs-table'

export default async function MetroDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: metro, error } = await supabase
    .from('metros')
    .select('id, name, slug, state, country, airroi_market_id, airdna_market_id, airbnb_search_config, crawl_enabled, crawl_cron, last_crawled_at, created_at, updated_at')
    .eq('id', id)
    .single()

  if (error || !metro) {
    notFound()
  }

  const { data: crawlRuns } = await supabase
    .from('crawl_runs')
    .select('id, started_at, finished_at, status, listings_discovered, listings_updated, listings_errored')
    .eq('metro_id', id)
    .order('started_at', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">{metro.name}</h1>
        <p className="text-sm text-muted-foreground">{metro.slug}</p>
      </div>

      <section>
        <h2 className="text-lg font-medium mb-2">Worker smoke test</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Sends a <code>metros/ping.requested</code> event. The worker should insert a
          row into <code>crawl_runs</code> with status <code>ping_ok</code> within a few seconds.
        </p>
        <PingButton metroId={metro.id} />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-2">Recent crawl runs</h2>
        <CrawlRunsTable runs={crawlRuns ?? []} />
      </section>

      <section>
        <h2 className="text-lg font-medium mb-4">Edit metro</h2>
        <MetroForm
          mode="edit"
          metroId={metro.id}
          defaultValues={{
            name: metro.name,
            slug: metro.slug,
            state: metro.state,
            country: metro.country,
            airroi_market_id: metro.airroi_market_id ?? '',
            airdna_market_id: metro.airdna_market_id ?? '',
            crawl_enabled: metro.crawl_enabled,
            crawl_cron: metro.crawl_cron,
            airbnb_search_config: (metro.airbnb_search_config as Record<string, unknown>) ?? {},
          }}
        />
      </section>
    </div>
  )
}
