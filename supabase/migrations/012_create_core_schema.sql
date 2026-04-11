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
