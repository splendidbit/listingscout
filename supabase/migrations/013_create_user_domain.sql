-- 013_create_user_domain.sql
-- User-owned state: leads, lead_events, contacts, enrichment_runs, crawl_runs.

-- ─── Lead state enum ────────────────────────────────────────────────────────
CREATE TYPE public.lead_state AS ENUM (
  'discovered',
  'market_scored',
  'operator_scored',
  'matched',
  'in_review',
  'enrich_light',
  'enrich_permit',
  'enrich_broker',
  'enrich_agent',
  'qualified',
  'rejected',
  'archived'
);

-- ─── leads ──────────────────────────────────────────────────────────────────
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  metro_id UUID NOT NULL REFERENCES public.metros(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,

  state public.lead_state NOT NULL DEFAULT 'discovered',

  upside_score INTEGER CHECK (upside_score >= 0 AND upside_score <= 100),
  operator_pain_score INTEGER CHECK (operator_pain_score >= 0 AND operator_pain_score <= 100),
  composite_score INTEGER CHECK (composite_score >= 0 AND composite_score <= 100),
  score_breakdown JSONB,

  rejection_reason TEXT,
  notes TEXT,

  scored_at TIMESTAMPTZ,
  state_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_leads_user_listing ON public.leads(user_id, listing_id);
CREATE INDEX idx_leads_user_state ON public.leads(user_id, state);
CREATE INDEX idx_leads_user_score ON public.leads(user_id, composite_score DESC);
CREATE INDEX idx_leads_metro ON public.leads(metro_id);

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── lead_events ────────────────────────────────────────────────────────────
CREATE TABLE public.lead_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

  event_type TEXT NOT NULL,
  actor TEXT NOT NULL,  -- 'worker' | 'user:<uuid>' | 'system'
  payload JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lead_events_lead_time ON public.lead_events(lead_id, created_at DESC);

-- ─── contacts ──────────────────────────────────────────────────────────────
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,

  contact_type TEXT NOT NULL CHECK (contact_type IN (
    'email','phone','linkedin','website','address','instagram','facebook','twitter','other'
  )),
  value TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('high','medium','low')),
  source TEXT NOT NULL CHECK (source IN (
    'airbnb','permit','assessor','hunter','apollo','pdl','agent','web','user_manual'
  )),
  source_url TEXT,

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  stale BOOLEAN NOT NULL DEFAULT false,

  enrichment_run_id UUID  -- FK added after enrichment_runs is created below
);

CREATE INDEX idx_contacts_host ON public.contacts(host_id);
CREATE UNIQUE INDEX idx_contacts_host_type_value ON public.contacts(host_id, contact_type, value);

-- ─── enrichment_runs ────────────────────────────────────────────────────────
CREATE TABLE public.enrichment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

  tier TEXT NOT NULL CHECK (tier IN ('light','permit','broker','agent')),
  status TEXT NOT NULL CHECK (status IN ('pending','running','success','failed','skipped')),

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  cost_usd NUMERIC(8,4),

  findings_summary TEXT,
  results JSONB,
  error TEXT,

  triggered_by TEXT NOT NULL  -- 'user:<uuid>' | 'auto'
);

CREATE INDEX idx_enrichment_runs_lead ON public.enrichment_runs(lead_id, started_at DESC);

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_enrichment_run_fk
  FOREIGN KEY (enrichment_run_id) REFERENCES public.enrichment_runs(id) ON DELETE SET NULL;

-- ─── crawl_runs ─────────────────────────────────────────────────────────────
CREATE TABLE public.crawl_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metro_id UUID NOT NULL REFERENCES public.metros(id) ON DELETE CASCADE,

  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running','success','failed','ping_ok')),

  listings_discovered INTEGER NOT NULL DEFAULT 0,
  listings_updated INTEGER NOT NULL DEFAULT 0,
  listings_errored INTEGER NOT NULL DEFAULT 0,

  errors JSONB
);

CREATE INDEX idx_crawl_runs_metro_time ON public.crawl_runs(metro_id, started_at DESC);
