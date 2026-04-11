-- 014_rls_policies.sql
-- Row Level Security for all new tables.
--
-- User-owned (scoped by user_id): metros, leads, lead_events,
--   enrichment_runs, crawl_runs.
-- Global (readable by any authed user; writable only by service role):
--   hosts, listings, listing_snapshots, market_benchmarks, contacts.

-- ─── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.metros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrichment_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crawl_runs ENABLE ROW LEVEL SECURITY;

-- ─── metros (user-owned) ────────────────────────────────────────────────────
CREATE POLICY "metros_select_own" ON public.metros
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "metros_insert_own" ON public.metros
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "metros_update_own" ON public.metros
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "metros_delete_own" ON public.metros
  FOR DELETE USING (user_id = auth.uid());

-- ─── hosts (global read; writes via service role only) ─────────────────────
CREATE POLICY "hosts_select_all_authed" ON public.hosts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── listings (global read) ─────────────────────────────────────────────────
CREATE POLICY "listings_select_all_authed" ON public.listings
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── listing_snapshots (global read) ────────────────────────────────────────
CREATE POLICY "listing_snapshots_select_all_authed" ON public.listing_snapshots
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── market_benchmarks (global read) ────────────────────────────────────────
CREATE POLICY "market_benchmarks_select_all_authed" ON public.market_benchmarks
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── leads (user-owned) ─────────────────────────────────────────────────────
CREATE POLICY "leads_select_own" ON public.leads
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "leads_insert_own" ON public.leads
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "leads_update_own" ON public.leads
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "leads_delete_own" ON public.leads
  FOR DELETE USING (user_id = auth.uid());

-- ─── lead_events (user scoped via leads join) ───────────────────────────────
CREATE POLICY "lead_events_select_own" ON public.lead_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_events.lead_id AND leads.user_id = auth.uid()
    )
  );
CREATE POLICY "lead_events_insert_own" ON public.lead_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = lead_events.lead_id AND leads.user_id = auth.uid()
    )
  );

-- ─── contacts (global read for now; writes via service role) ───────────────
CREATE POLICY "contacts_select_all_authed" ON public.contacts
  FOR SELECT USING (auth.role() = 'authenticated');

-- ─── enrichment_runs (user scoped via leads join) ──────────────────────────
CREATE POLICY "enrichment_runs_select_own" ON public.enrichment_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = enrichment_runs.lead_id AND leads.user_id = auth.uid()
    )
  );
CREATE POLICY "enrichment_runs_insert_own" ON public.enrichment_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE leads.id = enrichment_runs.lead_id AND leads.user_id = auth.uid()
    )
  );

-- ─── crawl_runs (user scoped via metros join) ──────────────────────────────
CREATE POLICY "crawl_runs_select_own" ON public.crawl_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.metros
      WHERE metros.id = crawl_runs.metro_id AND metros.user_id = auth.uid()
    )
  );

-- Note: Service-role writes bypass RLS automatically; no INSERT policies
-- needed for global tables or worker-owned writes.
