# Foundation — Sub-Project 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the app foundation — new Supabase schema, Inngest orchestrator wired to a deployed non-serverless worker, and a Metros CRUD screen with an end-to-end "ping worker" smoke test.

**Architecture:** Three-tier system. Next.js on Vercel writes events to Inngest; Inngest fans out jobs to a Fastify worker running on Fly.io; all state lives in Supabase Postgres. The worker talks to external APIs (Bright Data proxies for AirBNB later; none in this sub-project) and writes results back to Supabase. This sub-project only proves the wiring with a ping function — no scraping, no scoring.

**Tech Stack:**
- **Web:** Next.js 16.1.6 (App Router, React 19), TypeScript 5.9, Tailwind 4, shadcn/ui, Zod, React Hook Form
- **Orchestration:** Inngest (free tier)
- **Worker:** Node 20, Fastify, Inngest TypeScript SDK, Supabase JS client
- **Testing:** Vitest (to be installed in Task 1)
- **DB:** Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel (web), Fly.io (worker)

**Spec reference:** `docs/superpowers/specs/2026-04-11-revenue-share-cohost-lead-pipeline-design.md`

---

## Prerequisites (manual, do these first)

Before starting Task 1, confirm all of these are ready. They aren't steps the agent can do — they require human signup and credentials.

- [ ] **Inngest account.** Sign up at inngest.com. Create an app named `listingscout`. Capture the signing key and event key — you'll paste these into `.env.local` (web) and the worker env.
- [ ] **Fly.io account + flyctl CLI.** `brew install flyctl` (macOS) then `flyctl auth signup`.
- [ ] **Supabase CLI.** `brew install supabase/tap/supabase`. Used to run local migrations and regenerate TypeScript types.
- [ ] **Existing Supabase project.** The repo's `.env.local` already has project credentials from the old app. Verify `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are set. If not, grab them from the Supabase dashboard.
- [ ] **New feature branch.** Create a dedicated branch for this sub-project:
  ```bash
  git checkout main
  git pull
  git checkout -b feature/foundation-rebuild
  ```
- [ ] **Back up existing data** (if any matters). The first migration drops old domain tables. If there's data in `campaigns`, `listings`, `owners`, etc. worth keeping, export it first:
  ```bash
  supabase db dump --data-only -f backup-$(date +%Y%m%d).sql
  ```

Bright Data account is **not** needed for this sub-project — it's first required in Sub-Project 2 when scraping begins. Defer the signup until then unless you want to get it out of the way.

---

## Task 1: Install and configure Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json` (add test scripts and devDeps)
- Create: `tests/setup.ts`
- Create: `tests/smoke.test.ts`

- [ ] **Step 1: Install Vitest and supporting packages**

Run:
```bash
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

Expected: packages install without error.

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 3: Create `tests/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest'
```

- [ ] **Step 4: Add test scripts to `package.json`**

Add under `"scripts"`:
```json
"test": "vitest run",
"test:watch": "vitest",
"test:ui": "vitest --ui"
```

- [ ] **Step 5: Write a smoke test at `tests/smoke.test.ts`**

```ts
import { describe, it, expect } from 'vitest'

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the smoke test**

Run: `npm test`
Expected: `tests/smoke.test.ts` passes (1 passed).

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/smoke.test.ts package.json package-lock.json
git commit -m "test: install vitest and wire up smoke test"
```

---

## Task 2: Drop old domain tables (migration 011)

**Files:**
- Create: `supabase/migrations/011_reset_domain.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/011_reset_domain.sql`:

```sql
-- 011_reset_domain.sql
-- Tear down the old domain schema. Leaves auth.profiles and supporting
-- functions intact. The new schema is created in subsequent migrations.

-- Drop tables in dependency order
DROP TABLE IF EXISTS public.listing_owners CASCADE;
DROP TABLE IF EXISTS public.owners CASCADE;
DROP TABLE IF EXISTS public.listings CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- Any campaign-specific functions from 007 that depended on the old tables
DROP FUNCTION IF EXISTS public.refresh_campaign_stats(UUID) CASCADE;
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run:
```bash
supabase db reset
```

Expected: `supabase db reset` applies all migrations from scratch (including the new 011). The `listings`, `campaigns`, `owners`, etc. tables no longer exist. No errors.

If you don't want to wipe the whole local DB, apply just this migration instead:
```bash
supabase db push
```

- [ ] **Step 3: Verify the drop**

Run:
```bash
supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('listings','campaigns','owners','listing_owners','audit_log');"
```

Expected: empty result set.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/011_reset_domain.sql
git commit -m "feat(db): drop old domain tables to prepare for rebuild"
```

---

## Task 3: Create core global schema — metros, hosts, listings, snapshots, benchmarks (migration 012)

**Files:**
- Create: `supabase/migrations/012_create_core_schema.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/012_create_core_schema.sql`:

```sql
-- 012_create_core_schema.sql
-- Core tables: metros (user-owned), and the global facts tables
-- (hosts, listings, listing_snapshots, market_benchmarks).

-- ─── metros ─────────────────────────────────────────────────────────────────
CREATE TABLE public.metros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  airroi_market_id TEXT,
  airdna_market_id TEXT,

  airbnb_search_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  permit_registry_config JSONB,

  crawl_enabled BOOLEAN NOT NULL DEFAULT false,
  crawl_cron TEXT NOT NULL DEFAULT '0 7 * * *',  -- 7am UTC daily
  last_crawled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_metros_user_slug ON public.metros(user_id, slug);
CREATE INDEX idx_metros_user ON public.metros(user_id);

CREATE TRIGGER metros_updated_at
  BEFORE UPDATE ON public.metros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─── hosts (GLOBAL) ─────────────────────────────────────────────────────────
CREATE TABLE public.hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  airbnb_host_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  profile_url TEXT,

  joined_month DATE,
  superhost BOOLEAN,
  response_rate_pct NUMERIC(5,2),
  identity_verified BOOLEAN,

  listing_count_observed INTEGER NOT NULL DEFAULT 0,
  excluded BOOLEAN NOT NULL DEFAULT false,
  exclusion_reason TEXT,

  cohost_presence BOOLEAN NOT NULL DEFAULT false,
  pm_company_detected BOOLEAN NOT NULL DEFAULT false,

  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ
);

CREATE INDEX idx_hosts_excluded ON public.hosts(excluded) WHERE excluded = true;
CREATE INDEX idx_hosts_listing_count ON public.hosts(listing_count_observed);

-- ─── listings (GLOBAL) ──────────────────────────────────────────────────────
CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  airbnb_listing_id TEXT NOT NULL UNIQUE,
  host_id UUID NOT NULL REFERENCES public.hosts(id) ON DELETE CASCADE,
  metro_id UUID NOT NULL REFERENCES public.metros(id) ON DELETE CASCADE,

  listing_url TEXT NOT NULL,
  title TEXT,
  room_type TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC(3,1),
  max_guests INTEGER,

  neighborhood TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  photo_count INTEGER,
  photo_hash TEXT,

  nightly_rate NUMERIC(10,2),
  cleaning_fee NUMERIC(10,2),
  minimum_stay INTEGER,
  instant_book BOOLEAN,
  cancellation_policy TEXT,

  amenities JSONB,
  amenity_count INTEGER,

  avg_rating NUMERIC(3,2),
  total_reviews INTEGER,
  sub_ratings JSONB,
  last_review_at TIMESTAMPTZ,

  description_hash TEXT,

  discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_refreshed_at TIMESTAMPTZ,

  raw_payload JSONB
);

CREATE INDEX idx_listings_host ON public.listings(host_id);
CREATE INDEX idx_listings_metro ON public.listings(metro_id);

-- ─── listing_snapshots ──────────────────────────────────────────────────────
CREATE TABLE public.listing_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  photo_hash TEXT,
  description_hash TEXT,
  title TEXT,

  nightly_rate NUMERIC(10,2),
  avg_rating NUMERIC(3,2),
  total_reviews INTEGER
);

CREATE INDEX idx_listing_snapshots_listing_time ON public.listing_snapshots(listing_id, snapshot_at DESC);

-- ─── market_benchmarks ──────────────────────────────────────────────────────
CREATE TABLE public.market_benchmarks (
  metro_id UUID NOT NULL REFERENCES public.metros(id) ON DELETE CASCADE,
  property_type TEXT NOT NULL,
  bedroom_bucket INTEGER NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('airroi', 'airdna')),

  market_adr NUMERIC(10,2),
  market_occupancy NUMERIC(5,4),
  market_revenue NUMERIC(12,2),
  market_revpar NUMERIC(10,2),

  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (metro_id, property_type, bedroom_bucket, source)
);
```

- [ ] **Step 2: Apply migration**

Run:
```bash
supabase db reset
```

Expected: migrations 001-012 all apply cleanly.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('metros','hosts','listings','listing_snapshots','market_benchmarks') ORDER BY table_name;"
```

Expected: 5 rows — hosts, listing_snapshots, listings, market_benchmarks, metros.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/012_create_core_schema.sql
git commit -m "feat(db): create core schema — metros, hosts, listings, snapshots, benchmarks"
```

---

## Task 4: Create user-domain tables — leads, events, contacts, enrichment_runs, crawl_runs (migration 013)

**Files:**
- Create: `supabase/migrations/013_create_user_domain.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/013_create_user_domain.sql`:

```sql
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
```

- [ ] **Step 2: Apply migration**

Run:
```bash
supabase db reset
```

Expected: all migrations apply cleanly.

- [ ] **Step 3: Verify tables exist**

Run:
```bash
supabase db execute --sql "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('leads','lead_events','contacts','enrichment_runs','crawl_runs') ORDER BY table_name;"
```

Expected: 5 rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/013_create_user_domain.sql
git commit -m "feat(db): create user-domain tables — leads, events, contacts, enrichment, crawl_runs"
```

---

## Task 5: RLS policies (migration 014)

**Files:**
- Create: `supabase/migrations/014_rls_policies.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/014_rls_policies.sql`:

```sql
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
```

- [ ] **Step 2: Apply migration**

Run:
```bash
supabase db reset
```

Expected: all migrations apply cleanly.

- [ ] **Step 3: Verify RLS is enabled**

Run:
```bash
supabase db execute --sql "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename IN ('metros','hosts','listings','leads','contacts','crawl_runs') ORDER BY tablename;"
```

Expected: all six rows show `rowsecurity = true`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/014_rls_policies.sql
git commit -m "feat(db): enable RLS and add policies for all new tables"
```

---

## Task 6: Regenerate TypeScript types from database

**Files:**
- Modify: `src/types/database.ts` (overwrite with regenerated content)

- [ ] **Step 1: Regenerate types via Supabase CLI**

Run (for local DB):
```bash
supabase gen types typescript --local > src/types/database.ts
```

Or for linked remote project:
```bash
supabase gen types typescript --linked > src/types/database.ts
```

Expected: `src/types/database.ts` is overwritten with TypeScript types for the new tables. No command-line errors.

- [ ] **Step 2: Verify type file compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: completes without errors. (It may show errors from old code that references dropped tables — those will be cleaned up in Task 7.)

- [ ] **Step 3: Commit**

```bash
git add src/types/database.ts
git commit -m "feat(types): regenerate database types for new schema"
```

---

## Task 7: Delete old dashboard routes and supporting code

**Files:**
- Delete: `src/app/(dashboard)/campaigns/` (entire directory)
- Delete: `src/app/(dashboard)/listings/` (entire directory)
- Delete: `src/app/(dashboard)/owners/` (entire directory)
- Delete: `src/app/(dashboard)/leads/` (entire directory — old leads, will be replaced in SP3)
- Delete: `src/app/(dashboard)/exports/` (entire directory — will be replaced in SP5)
- Delete: `src/app/api/airdna/`, `src/app/api/airroi/`, `src/app/api/campaigns/`, `src/app/api/listings/`, `src/app/api/scoring/`, `src/app/api/export/`, `src/app/api/ai/`
- Delete: `src/lib/airdna/`, `src/lib/airroi/`, `src/lib/campaigns/`, `src/lib/dedup/`, `src/lib/google-sheets/`, `src/lib/listings/`, `src/lib/scoring/`, `src/lib/ai/`
- Delete: `src/components/campaigns/`, `src/components/listings/`, `src/components/owners/` if present
- Modify: `src/app/(dashboard)/dashboard/page.tsx` — replace content with a placeholder
- Modify: `src/app/(dashboard)/layout.tsx` or sidebar component — remove links to deleted routes

- [ ] **Step 1: Inventory what's present**

Run:
```bash
ls src/app/\(dashboard\)
ls src/app/api
ls src/lib
ls src/components
```

Expected: confirm the above directories exist before deleting. Note any additional directories that should also go (anything that references the old scoring/campaigns/listings/owners model).

- [ ] **Step 2: Delete old dashboard routes**

Run:
```bash
rm -rf src/app/\(dashboard\)/campaigns
rm -rf src/app/\(dashboard\)/listings
rm -rf src/app/\(dashboard\)/owners
rm -rf src/app/\(dashboard\)/leads
rm -rf src/app/\(dashboard\)/exports
```

- [ ] **Step 3: Delete old API routes**

Run:
```bash
rm -rf src/app/api/airdna
rm -rf src/app/api/airroi
rm -rf src/app/api/campaigns
rm -rf src/app/api/listings
rm -rf src/app/api/scoring
rm -rf src/app/api/export
rm -rf src/app/api/ai
```

- [ ] **Step 4: Delete old lib code**

Run:
```bash
rm -rf src/lib/airdna
rm -rf src/lib/airroi
rm -rf src/lib/campaigns
rm -rf src/lib/dedup
rm -rf src/lib/google-sheets
rm -rf src/lib/listings
rm -rf src/lib/scoring
rm -rf src/lib/ai
rm -rf src/lib/actions  # to be rebuilt in Task 15
```

- [ ] **Step 5: Delete old components**

Run:
```bash
rm -rf src/components/campaigns 2>/dev/null || true
rm -rf src/components/listings 2>/dev/null || true
rm -rf src/components/owners 2>/dev/null || true
```

- [ ] **Step 6: Replace dashboard placeholder**

Overwrite `src/app/(dashboard)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-2">Dashboard</h1>
      <p className="text-sm text-muted-foreground">
        The rebuild is underway. Configure metros from the Metros page.
      </p>
    </div>
  )
}
```

- [ ] **Step 7: Update sidebar links**

Inspect `src/components/layout/` (or wherever the sidebar lives):

Run:
```bash
grep -rn "campaigns\|owners\|exports" src/components/layout 2>/dev/null
```

For each link that points to a deleted route, remove it. Add a single link to `/metros` pointing at the page that will be created in Task 16.

Concrete example — if the sidebar file is `src/components/layout/sidebar.tsx`, the nav array should look like:

```tsx
const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/metros', label: 'Metros' },
  { href: '/settings', label: 'Settings' },
]
```

Remove old items. Do not remove `settings` — it's auth/profile, not domain.

- [ ] **Step 8: Verify the build**

Run:
```bash
npx tsc --noEmit
```

Expected: no TypeScript errors. If any remain, they'll be imports from deleted files — delete the importing files too if they belong to the old domain, or fix imports if they're infrastructure.

Run:
```bash
npm run build
```

Expected: Next.js build completes. Any remaining route-level errors must be resolved before moving on.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor: delete old domain routes, libs, and components"
```

---

## Task 8: Install Inngest SDK and create Next.js client

**Files:**
- Modify: `package.json` (add `inngest` dep)
- Create: `src/lib/inngest/client.ts`
- Create: `src/lib/inngest/events.ts`

- [ ] **Step 1: Install Inngest**

Run:
```bash
npm install inngest
```

Expected: `inngest` package added to dependencies.

- [ ] **Step 2: Create `src/lib/inngest/events.ts`**

```ts
// Event payload definitions shared between the Next.js app (producer)
// and the worker (consumer). When adding a new event, add it here first.

export type InngestEvents = {
  'metros/ping.requested': {
    data: {
      metroId: string
      userId: string
    }
  }
}
```

- [ ] **Step 3: Create `src/lib/inngest/client.ts`**

```ts
import { Inngest } from 'inngest'
import type { InngestEvents } from './events'

export const inngest = new Inngest({
  id: 'listingscout',
  schemas: {
    fromRecord<T>() {
      return null as unknown as T
    },
  } as never,
})

// Typed send helper — preferred over calling inngest.send directly from app code.
export async function sendEvent<K extends keyof InngestEvents>(
  name: K,
  data: InngestEvents[K]['data']
): Promise<void> {
  await inngest.send({ name: name as string, data })
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/lib/inngest
git commit -m "feat(inngest): install SDK and create client + event types"
```

---

## Task 9: Create /api/inngest serve route

**Files:**
- Create: `src/app/api/inngest/route.ts`
- Create: `src/lib/inngest/functions/index.ts` (empty registry for now — worker owns the ping function)

- [ ] **Step 1: Create empty functions registry**

Create `src/lib/inngest/functions/index.ts`:

```ts
// Inngest functions registered on the Next.js side.
// Most functions live on the worker; this file is for functions that
// genuinely need to run in-process with Next.js (e.g., sending emails
// using Next.js-only modules).
// Currently empty — the ping function runs on the worker.

export const functions = [] as const
```

- [ ] **Step 2: Create `src/app/api/inngest/route.ts`**

```ts
import { serve } from 'inngest/next'
import { inngest } from '@/lib/inngest/client'
import { functions } from '@/lib/inngest/functions'

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
})
```

- [ ] **Step 3: Verify the route compiles**

Run:
```bash
npm run build
```

Expected: Next.js builds, including the `/api/inngest` route.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/inngest src/lib/inngest/functions
git commit -m "feat(inngest): add /api/inngest serve handler"
```

---

## Task 10: Create worker scaffold (package.json, tsconfig, directory structure)

**Files:**
- Create: `worker/package.json`
- Create: `worker/tsconfig.json`
- Create: `worker/.gitignore`
- Create: `worker/src/index.ts` (stub)

- [ ] **Step 1: Create `worker/package.json`**

```json
{
  "name": "listingscout-worker",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.99.1",
    "fastify": "^5.0.0",
    "inngest": "^3.0.0",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@types/node": "^20",
    "tsx": "^4.0.0",
    "typescript": "^5.9.3",
    "vitest": "^2.0.0"
  }
}
```

- [ ] **Step 2: Create `worker/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create `worker/.gitignore`**

```
node_modules
dist
.env
.env.local
```

- [ ] **Step 4: Install worker dependencies**

Run:
```bash
cd worker && npm install && cd ..
```

Expected: worker's `node_modules` populated, `package-lock.json` created.

- [ ] **Step 5: Create stub `worker/src/index.ts`**

```ts
console.log('listingscout-worker booting...')
```

- [ ] **Step 6: Verify the stub runs**

Run:
```bash
cd worker && npx tsx src/index.ts && cd ..
```

Expected: prints `listingscout-worker booting...`.

- [ ] **Step 7: Commit**

```bash
git add worker/
git commit -m "feat(worker): scaffold worker package and tsconfig"
```

---

## Task 11: Build worker HTTP server with /health endpoint

**Files:**
- Modify: `worker/src/index.ts`
- Create: `worker/src/lib/env.ts`
- Create: `worker/src/routes/health.ts`
- Create: `worker/tests/health.test.ts`

- [ ] **Step 1: Create `worker/src/lib/env.ts`**

```ts
import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().default(8080),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
})

export const env = schema.parse(process.env)
export type Env = z.infer<typeof schema>
```

- [ ] **Step 2: Create `worker/src/routes/health.ts`**

```ts
import type { FastifyInstance } from 'fastify'

export async function registerHealthRoute(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => ({
    status: 'ok',
    service: 'listingscout-worker',
    timestamp: new Date().toISOString(),
  }))
}
```

- [ ] **Step 3: Write the failing test at `worker/tests/health.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { registerHealthRoute } from '../src/routes/health.js'

describe('GET /health', () => {
  it('returns status ok with service name', async () => {
    const app = Fastify()
    await registerHealthRoute(app)
    const res = await app.inject({ method: 'GET', url: '/health' })

    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.status).toBe('ok')
    expect(body.service).toBe('listingscout-worker')
    expect(typeof body.timestamp).toBe('string')

    await app.close()
  })
})
```

- [ ] **Step 4: Create a minimal vitest config in worker**

Create `worker/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
  },
})
```

- [ ] **Step 5: Run the test — expect PASS**

Run:
```bash
cd worker && npm test && cd ..
```

Expected: `health.test.ts` passes (1 passed).

(Note: this test does not need the env vars because it exercises the route directly without starting the server.)

- [ ] **Step 6: Replace `worker/src/index.ts` with the real server**

```ts
import Fastify from 'fastify'
import { env } from './lib/env.js'
import { registerHealthRoute } from './routes/health.js'

async function main() {
  const app = Fastify({
    logger: { level: 'info' },
  })

  await registerHealthRoute(app)

  await app.listen({ host: '0.0.0.0', port: env.PORT })
  app.log.info(`listingscout-worker listening on :${env.PORT}`)
}

main().catch((err) => {
  console.error('worker failed to start', err)
  process.exit(1)
})
```

- [ ] **Step 7: Create a worker `.env` for local dev**

Create `worker/.env` (gitignored):

```
PORT=8080
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
INNGEST_EVENT_KEY=placeholder-until-inngest-setup
INNGEST_SIGNING_KEY=placeholder-until-inngest-setup
```

Fill in real values. Do NOT commit this file.

- [ ] **Step 8: Smoke test the worker locally**

In one terminal:
```bash
cd worker && npx tsx --env-file=.env src/index.ts
```

In another:
```bash
curl http://localhost:8080/health
```

Expected: JSON response `{"status":"ok","service":"listingscout-worker","timestamp":"..."}`.

Stop the worker (Ctrl+C).

- [ ] **Step 9: Commit**

```bash
git add worker/src worker/tests worker/vitest.config.ts
git commit -m "feat(worker): add fastify server with /health endpoint"
```

---

## Task 12: Worker Supabase client

**Files:**
- Create: `worker/src/lib/supabase.ts`
- Create: `worker/tests/supabase.test.ts`

- [ ] **Step 1: Write the failing test at `worker/tests/supabase.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest'

describe('worker supabase client', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.INNGEST_EVENT_KEY = 'test'
    process.env.INNGEST_SIGNING_KEY = 'test'
  })

  it('creates a client singleton', async () => {
    const { getSupabase } = await import('../src/lib/supabase.js')
    const a = getSupabase()
    const b = getSupabase()
    expect(a).toBe(b)
  })
})
```

- [ ] **Step 2: Run the test — expect FAIL**

Run:
```bash
cd worker && npm test && cd ..
```

Expected: test fails with "Cannot find module '../src/lib/supabase.js'".

- [ ] **Step 3: Create `worker/src/lib/supabase.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env.js'

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
  }
  return client
}
```

- [ ] **Step 4: Run the test — expect PASS**

Run:
```bash
cd worker && npm test && cd ..
```

Expected: both `health.test.ts` and `supabase.test.ts` pass.

- [ ] **Step 5: Commit**

```bash
git add worker/src/lib/supabase.ts worker/tests/supabase.test.ts
git commit -m "feat(worker): add supabase service-role client singleton"
```

---

## Task 13: Worker Inngest client and ping function

**Files:**
- Create: `worker/src/inngest/client.ts`
- Create: `worker/src/inngest/events.ts`
- Create: `worker/src/inngest/functions/ping.ts`
- Create: `worker/src/inngest/functions/index.ts`
- Create: `worker/tests/ping.test.ts`
- Modify: `worker/src/index.ts` (register Inngest serve endpoint)

- [ ] **Step 1: Create `worker/src/inngest/events.ts`**

This must stay in sync with `src/lib/inngest/events.ts` in the web app. When adding events, update both files.

```ts
export type InngestEvents = {
  'metros/ping.requested': {
    data: {
      metroId: string
      userId: string
    }
  }
}
```

- [ ] **Step 2: Create `worker/src/inngest/client.ts`**

```ts
import { Inngest } from 'inngest'
import type { InngestEvents } from './events.js'

// Re-export for use across worker code
export type { InngestEvents }

export const inngest = new Inngest({
  id: 'listingscout',
})
```

- [ ] **Step 3: Write the failing test at `worker/tests/ping.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('ping function', () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://example.supabase.co'
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key'
    process.env.INNGEST_EVENT_KEY = 'test'
    process.env.INNGEST_SIGNING_KEY = 'test'
    vi.resetModules()
  })

  it('writes a crawl_runs row with status ping_ok for the given metro', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: [{ id: 'crawl-1' }], error: null })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })

    vi.doMock('../src/lib/supabase.js', () => ({
      getSupabase: () => ({ from: fromMock }),
    }))

    const { runPing } = await import('../src/inngest/functions/ping.js')

    const result = await runPing({
      metroId: 'metro-123',
      userId: 'user-456',
    })

    expect(fromMock).toHaveBeenCalledWith('crawl_runs')
    expect(insertMock).toHaveBeenCalledWith({
      metro_id: 'metro-123',
      status: 'ping_ok',
      started_at: expect.any(String),
      finished_at: expect.any(String),
      listings_discovered: 0,
      listings_updated: 0,
      listings_errored: 0,
    })
    expect(result.ok).toBe(true)
  })

  it('returns ok: false when the insert errors', async () => {
    const insertMock = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const fromMock = vi.fn().mockReturnValue({ insert: insertMock })

    vi.doMock('../src/lib/supabase.js', () => ({
      getSupabase: () => ({ from: fromMock }),
    }))

    const { runPing } = await import('../src/inngest/functions/ping.js')

    const result = await runPing({ metroId: 'metro-123', userId: 'user-456' })

    expect(result.ok).toBe(false)
    expect(result.error).toContain('boom')
  })
})
```

- [ ] **Step 4: Run the test — expect FAIL**

Run:
```bash
cd worker && npm test && cd ..
```

Expected: ping tests fail with "Cannot find module '../src/inngest/functions/ping.js'".

- [ ] **Step 5: Create `worker/src/inngest/functions/ping.ts`**

```ts
import { inngest } from '../client.js'
import { getSupabase } from '../../lib/supabase.js'

export interface PingInput {
  metroId: string
  userId: string
}

export type PingResult =
  | { ok: true; crawlRunId?: string }
  | { ok: false; error: string }

// Pure business logic, separated from the Inngest function wrapper
// so it can be unit-tested without spinning up Inngest machinery.
export async function runPing(input: PingInput): Promise<PingResult> {
  const supabase = getSupabase()
  const now = new Date().toISOString()

  const { data, error } = await supabase.from('crawl_runs').insert({
    metro_id: input.metroId,
    status: 'ping_ok',
    started_at: now,
    finished_at: now,
    listings_discovered: 0,
    listings_updated: 0,
    listings_errored: 0,
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  return { ok: true }
}

// Inngest function registration
export const pingFunction = inngest.createFunction(
  { id: 'metros-ping' },
  { event: 'metros/ping.requested' },
  async ({ event, step }) => {
    const result = await step.run('write-crawl-run', () =>
      runPing({
        metroId: event.data.metroId,
        userId: event.data.userId,
      })
    )

    if (!result.ok) {
      throw new Error(`ping failed: ${result.error}`)
    }

    return result
  }
)
```

- [ ] **Step 6: Create `worker/src/inngest/functions/index.ts`**

```ts
import { pingFunction } from './ping.js'

export const functions = [pingFunction]
```

- [ ] **Step 7: Run the test — expect PASS**

Run:
```bash
cd worker && npm test && cd ..
```

Expected: all three test files pass — health, supabase, ping.

- [ ] **Step 8: Register Inngest serve endpoint in the Fastify app**

Modify `worker/src/index.ts`:

```ts
import Fastify from 'fastify'
import { serve } from 'inngest/fastify'
import { env } from './lib/env.js'
import { registerHealthRoute } from './routes/health.js'
import { inngest } from './inngest/client.js'
import { functions } from './inngest/functions/index.js'

async function main() {
  const app = Fastify({
    logger: { level: 'info' },
  })

  await registerHealthRoute(app)

  // Inngest fastify integration
  await app.register(serve, {
    client: inngest,
    functions,
  })

  await app.listen({ host: '0.0.0.0', port: env.PORT })
  app.log.info(`listingscout-worker listening on :${env.PORT}`)
}

main().catch((err) => {
  console.error('worker failed to start', err)
  process.exit(1)
})
```

Note: `inngest/fastify` provides a Fastify plugin. If the current Inngest SDK version does not export `serve` from `inngest/fastify`, fall back to registering Inngest's `serve` handler through Fastify's `.route()` — check the Inngest docs for the specific version installed.

- [ ] **Step 9: Start the worker locally**

Run:
```bash
cd worker && npx tsx --env-file=.env src/index.ts
```

Expected: worker starts. `GET /api/inngest` responds (404 or the Inngest info page). `GET /health` still works.

Stop the worker.

- [ ] **Step 10: Commit**

```bash
git add worker/src/inngest worker/tests/ping.test.ts worker/src/index.ts
git commit -m "feat(worker): add inngest client, ping function, and serve endpoint"
```

---

## Task 14: Metros Zod schema and server actions

**Files:**
- Create: `src/lib/metros/schema.ts`
- Create: `src/lib/metros/actions.ts`
- Create: `src/lib/metros/actions.test.ts`

- [ ] **Step 1: Create `src/lib/metros/schema.ts`**

```ts
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
```

- [ ] **Step 2: Write the failing test at `src/lib/metros/actions.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { metroFormSchema } from './schema'

describe('metroFormSchema', () => {
  const validInput = {
    name: 'Scottsdale',
    slug: 'scottsdale-az',
    state: 'AZ',
    country: 'US',
    airroi_market_id: null,
    airdna_market_id: null,
    crawl_enabled: true,
    crawl_cron: '0 7 * * *',
    airbnb_search_config: { bbox: [1, 2, 3, 4] },
  }

  it('accepts a valid input', () => {
    const result = metroFormSchema.parse(validInput)
    expect(result.name).toBe('Scottsdale')
    expect(result.slug).toBe('scottsdale-az')
    expect(result.state).toBe('AZ')
  })

  it('uppercases the state code', () => {
    const result = metroFormSchema.parse({ ...validInput, state: 'az' })
    expect(result.state).toBe('AZ')
  })

  it('rejects slugs with uppercase letters', () => {
    expect(() =>
      metroFormSchema.parse({ ...validInput, slug: 'Scottsdale-AZ' })
    ).toThrow()
  })

  it('rejects empty names', () => {
    expect(() =>
      metroFormSchema.parse({ ...validInput, name: '' })
    ).toThrow()
  })

  it('defaults country to US when omitted', () => {
    const { country: _c, ...rest } = validInput
    const result = metroFormSchema.parse(rest)
    expect(result.country).toBe('US')
  })
})
```

- [ ] **Step 3: Run the test — expect PASS**

Run:
```bash
npm test -- src/lib/metros/actions.test.ts
```

Expected: all 5 tests pass.

- [ ] **Step 4: Create `src/lib/metros/actions.ts`**

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { metroFormSchema, type MetroFormInput } from './schema'

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
      .update(parsed.data)
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

    const { sendEvent } = await import('@/lib/inngest/client')
    await sendEvent('metros/ping.requested', { metroId: metro.id, userId })

    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
```

- [ ] **Step 5: Verify TypeScript compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/metros
git commit -m "feat(metros): add schema and server actions (create, update, delete, ping)"
```

---

## Task 15: Metros list page

**Files:**
- Create: `src/app/(dashboard)/metros/page.tsx`

- [ ] **Step 1: Create the list page**

```tsx
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function MetrosPage() {
  const supabase = await createClient()

  const { data: metros, error } = await supabase
    .from('metros')
    .select('id, name, slug, state, crawl_enabled, last_crawled_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Metros</h1>
        <p className="text-red-500">Error loading metros: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Metros</h1>
        <Button asChild>
          <Link href="/metros/new">New metro</Link>
        </Button>
      </div>

      {metros && metros.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">No metros configured yet.</p>
          <Button asChild>
            <Link href="/metros/new">Create your first metro</Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">State</th>
                <th className="p-3">Crawl</th>
                <th className="p-3">Last crawled</th>
              </tr>
            </thead>
            <tbody>
              {metros?.map((m) => (
                <tr key={m.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`/metros/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{m.slug}</td>
                  <td className="p-3 text-sm">{m.state}</td>
                  <td className="p-3 text-sm">
                    {m.crawl_enabled ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {m.last_crawled_at
                      ? new Date(m.last_crawled_at).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

Run:
```bash
npm run build
```

Expected: route `/metros` builds successfully.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/metros/page.tsx
git commit -m "feat(metros): add list page"
```

---

## Task 16: Metro create form page

**Files:**
- Create: `src/app/(dashboard)/metros/new/page.tsx`
- Create: `src/components/metros/metro-form.tsx`

- [ ] **Step 1: Create `src/components/metros/metro-form.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { metroFormSchema, type MetroFormInput } from '@/lib/metros/schema'
import { createMetro, updateMetro } from '@/lib/metros/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

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
    setValue,
    watch,
    formState: { errors },
  } = useForm<MetroFormInput>({
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

  const crawlEnabled = watch('crawl_enabled')

  const onSubmit = (input: MetroFormInput) => {
    setServerError(null)
    startTransition(async () => {
      const result =
        mode === 'create'
          ? await createMetro(input)
          : await updateMetro(metroId!, input)

      if (result.status === 'success') {
        toast.success(mode === 'create' ? 'Metro created' : 'Metro updated')
        router.push(`/metros/${result.id}`)
      } else {
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

      <div className="flex items-center gap-3">
        <Switch
          id="crawl_enabled"
          checked={crawlEnabled}
          onCheckedChange={(v) => setValue('crawl_enabled', v)}
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
```

**Note:** If `Switch` is not yet in `src/components/ui/`, install it via shadcn:
```bash
npx shadcn@latest add switch
```

- [ ] **Step 2: Create the new metro page**

Create `src/app/(dashboard)/metros/new/page.tsx`:

```tsx
import { MetroForm } from '@/components/metros/metro-form'

export default function NewMetroPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New metro</h1>
      <MetroForm mode="create" />
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

Run:
```bash
npm run build
```

Expected: both `/metros` and `/metros/new` build cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/components/metros src/app/\(dashboard\)/metros/new
git commit -m "feat(metros): add create form page and reusable MetroForm component"
```

---

## Task 17: Metro edit page with ping-worker button

**Files:**
- Create: `src/app/(dashboard)/metros/[id]/page.tsx`
- Create: `src/components/metros/ping-button.tsx`
- Create: `src/components/metros/crawl-runs-table.tsx`

- [ ] **Step 1: Create the ping button client component**

Create `src/components/metros/ping-button.tsx`:

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { triggerMetroPing } from '@/lib/metros/actions'

export function PingButton({ metroId }: { metroId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastPingAt, setLastPingAt] = useState<string | null>(null)

  const handleClick = () => {
    startTransition(async () => {
      const result = await triggerMetroPing(metroId)
      if (result.ok) {
        toast.success('Ping sent — worker will record a crawl_run row shortly')
        setLastPingAt(new Date().toLocaleTimeString())
        // Small delay so Inngest + worker have time to finish, then refresh
        setTimeout(() => router.refresh(), 2000)
      } else {
        toast.error(`Ping failed: ${result.error}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isPending} variant="outline">
        {isPending ? 'Pinging…' : 'Ping worker'}
      </Button>
      {lastPingAt && (
        <span className="text-xs text-muted-foreground">Last ping: {lastPingAt}</span>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create the crawl runs table**

Create `src/components/metros/crawl-runs-table.tsx`:

```tsx
interface CrawlRun {
  id: string
  started_at: string
  finished_at: string | null
  status: string
  listings_discovered: number
  listings_updated: number
  listings_errored: number
}

export function CrawlRunsTable({ runs }: { runs: CrawlRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No crawl runs yet.</p>
  }

  return (
    <div className="border rounded">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr className="text-left">
            <th className="p-2">Started</th>
            <th className="p-2">Finished</th>
            <th className="p-2">Status</th>
            <th className="p-2">Discovered</th>
            <th className="p-2">Updated</th>
            <th className="p-2">Errored</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{new Date(r.started_at).toLocaleString()}</td>
              <td className="p-2">
                {r.finished_at ? new Date(r.finished_at).toLocaleString() : '—'}
              </td>
              <td className="p-2">
                <StatusBadge status={r.status} />
              </td>
              <td className="p-2">{r.listings_discovered}</td>
              <td className="p-2">{r.listings_updated}</td>
              <td className="p-2">{r.listings_errored}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorClass =
    status === 'success' || status === 'ping_ok'
      ? 'text-green-600'
      : status === 'failed'
      ? 'text-red-600'
      : 'text-muted-foreground'
  return <span className={colorClass}>{status}</span>
}
```

- [ ] **Step 3: Create the metro detail page**

Create `src/app/(dashboard)/metros/[id]/page.tsx`:

```tsx
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
    .select('*')
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
```

- [ ] **Step 4: Verify build**

Run:
```bash
npm run build
```

Expected: the dynamic route `/metros/[id]` builds cleanly.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/metros/\[id\] src/components/metros/ping-button.tsx src/components/metros/crawl-runs-table.tsx
git commit -m "feat(metros): add detail page with ping button and recent crawl runs"
```

---

## Task 18: Deploy worker to Fly.io

**Files:**
- Create: `worker/Dockerfile`
- Create: `worker/fly.toml`

- [ ] **Step 1: Create `worker/Dockerfile`**

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npx tsc

FROM node:20-slim

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/index.js"]
```

- [ ] **Step 2: Create `worker/fly.toml`**

```toml
app = "listingscout-worker"
primary_region = "iad"

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

  [[http_service.checks]]
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory_mb = 512
```

**Note:** `app = "listingscout-worker"` must be globally unique on Fly. If taken, change to `listingscout-worker-<yourname>` and update accordingly.

- [ ] **Step 3: Initialize the Fly app**

Run:
```bash
cd worker && flyctl launch --no-deploy --copy-config --name listingscout-worker
```

Expected: Fly confirms the app is created. If the name is taken, flyctl will prompt for a new one.

- [ ] **Step 4: Set secrets**

Run (from `worker/`):
```bash
flyctl secrets set \
  SUPABASE_URL="$(grep NEXT_PUBLIC_SUPABASE_URL ../.env.local | cut -d= -f2-)" \
  SUPABASE_SERVICE_ROLE_KEY="$(grep SUPABASE_SERVICE_ROLE_KEY ../.env.local | cut -d= -f2-)" \
  INNGEST_EVENT_KEY="<paste-from-inngest-dashboard>" \
  INNGEST_SIGNING_KEY="<paste-from-inngest-dashboard>"
```

Expected: secrets set, Fly reports success.

- [ ] **Step 5: Deploy**

Run (from `worker/`):
```bash
flyctl deploy
```

Expected: build succeeds, machine starts, health check passes. `flyctl status` shows the machine as `passing`.

- [ ] **Step 6: Verify the deployed health endpoint**

Run:
```bash
curl https://listingscout-worker.fly.dev/health
```

Expected: JSON `{"status":"ok","service":"listingscout-worker","timestamp":"..."}`.

- [ ] **Step 7: Register the worker URL with Inngest**

In the Inngest dashboard → your app → Apps → add your worker URL:
```
https://listingscout-worker.fly.dev/api/inngest
```

Expected: Inngest detects the app and lists the `metros-ping` function.

- [ ] **Step 8: Set the same Inngest env vars on Vercel**

In the Vercel dashboard → project → Settings → Environment Variables, add:
- `INNGEST_EVENT_KEY`
- `INNGEST_SIGNING_KEY`

If running locally, add them to `.env.local` as well.

- [ ] **Step 9: Commit**

```bash
git add worker/Dockerfile worker/fly.toml
git commit -m "feat(worker): add Dockerfile and fly.toml for Fly.io deployment"
```

---

## Task 19: End-to-end smoke test (manual)

**Files:** None created. This is a documented verification step.

- [ ] **Step 1: Start the Next.js app**

Run:
```bash
npm run dev
```

Expected: Next.js dev server on `http://localhost:3000`.

- [ ] **Step 2: Log in and create a metro**

- Navigate to `http://localhost:3000`
- Log in with your existing account
- Click "Metros" → "New metro"
- Fill in: Name="Scottsdale", Slug="scottsdale-az", State="AZ", leave the rest default
- Click "Create metro"
- Expected: redirected to `/metros/<new-id>`. Toast shows "Metro created".

- [ ] **Step 3: Ping the worker**

On the metro detail page:
- Click "Ping worker"
- Expected toast: "Ping sent — worker will record a crawl_run row shortly"
- Wait 2–5 seconds
- The "Recent crawl runs" table should show a new row with status `ping_ok`

- [ ] **Step 4: Verify in Supabase directly**

Run:
```bash
supabase db execute --sql "SELECT id, metro_id, status, started_at, finished_at FROM public.crawl_runs ORDER BY started_at DESC LIMIT 1;"
```

Expected: one row with `status = 'ping_ok'` and matching `metro_id`.

- [ ] **Step 5: Verify in the Inngest dashboard**

Open the Inngest dashboard → Runs. The most recent run should be `metros-ping` with status `Completed`. Click it — the step output should be `{ ok: true }`.

- [ ] **Step 6: Verify in Fly logs**

Run:
```bash
cd worker && flyctl logs
```

Expected: you see the incoming `/api/inngest` request logged by the Fastify logger and the ping insert completing successfully.

- [ ] **Step 7: Commit — no changes, just tag completion**

```bash
git tag sub-project-1-foundation
git push origin feature/foundation-rebuild --tags
```

If the smoke test fails at any step, investigate **before** tagging and pushing. Do not move on to Sub-Project 2 until the full loop works.

---

## Task 20: Sub-project 1 wrap-up

- [ ] **Step 1: Update `README.md` with a short "Architecture" section**

Replace the existing `## Project Status` section with:

```markdown
## Architecture

ListingScout is being rebuilt around a revenue-share co-host lead pipeline.
See `docs/superpowers/specs/2026-04-11-revenue-share-cohost-lead-pipeline-design.md`
for the full design.

- **Web (Vercel, Next.js):** UI, metros config, review queue, auth
- **Orchestrator (Inngest):** cron, retries, fan-out
- **Worker (Fly.io, Fastify):** scraping, scoring, enrichment — never runs on Vercel
- **Database (Supabase):** Postgres + RLS, single data store

## Local development

1. Install deps: `npm install && (cd worker && npm install)`
2. Start Supabase locally: `supabase start`
3. Apply migrations: `supabase db reset`
4. Run the app: `npm run dev`
5. Run the worker: `cd worker && npx tsx --env-file=.env src/index.ts`
6. Run tests: `npm test` and `cd worker && npm test`
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update README with new architecture and local dev steps"
```

- [ ] **Step 3: Open a PR**

Run:
```bash
gh pr create --base main --head feature/foundation-rebuild --title "Sub-Project 1: Foundation — new schema, Inngest, worker, metros CRUD" --body "$(cat <<'EOF'
## Summary

First sub-project of the rebuild per `docs/superpowers/specs/2026-04-11-revenue-share-cohost-lead-pipeline-design.md`.

- Drops all old domain tables (campaigns, listings, owners, audit_log, favorites)
- Creates the new schema (metros, hosts, listings, listing_snapshots, market_benchmarks, leads, lead_events, contacts, enrichment_runs, crawl_runs) with RLS
- Installs Inngest client in Next.js and adds the `/api/inngest` serve handler
- Scaffolds a Fastify worker with `/health`, Inngest serve endpoint, and a `metros-ping` function that writes a `crawl_runs` row
- Deploys the worker to Fly.io
- Adds Metros list, create, and detail pages with a ping button

No scraping or scoring yet — that's Sub-Project 2. Smoke test: create a metro, click Ping, confirm a `ping_ok` crawl_runs row appears.

## Test plan

- [ ] `npm test` passes (vitest)
- [ ] `cd worker && npm test` passes
- [ ] `npm run build` succeeds
- [ ] `supabase db reset` applies all migrations cleanly
- [ ] Deployed worker `/health` returns 200
- [ ] End-to-end ping produces a `crawl_runs` row with `status='ping_ok'`
- [ ] Inngest dashboard shows the `metros-ping` run completed

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Review the PR checklist**

Before requesting review:

- [ ] All 20 tasks' commits are in the branch
- [ ] `git log --oneline main..feature/foundation-rebuild` shows one commit per task roughly
- [ ] No files committed that shouldn't be (`.env`, `worker/.env`, local build artifacts)
- [ ] The smoke test was verified end-to-end on a deployed worker, not just locally

---

## What's next — Sub-Project 2

Once this PR is merged, Sub-Project 2 begins: AirBNB scraper, AirROI/AirDNA benchmark fetcher, scoring engine (signals A + B), and the `discovered → matched` state machine. That plan will be written separately after this sub-project's execution reveals any surprises.

At that point, answers are needed for these Section 14 open questions:
- Bright Data credentials
- AirROI/AirDNA market IDs for Scottsdale (can be looked up during SP2 setup)

No answers needed now.
