-- 003_create_listings.sql

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- AirBNB Identifiers (dedup keys)
  listing_id TEXT NOT NULL, -- AirBNB's unique listing ID
  listing_url TEXT NOT NULL,
  
  -- Property Info
  listing_title TEXT NOT NULL,
  property_type TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  neighborhood TEXT,
  full_address TEXT, -- If discoverable
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  
  -- Property Details
  bedrooms INTEGER NOT NULL DEFAULT 0,
  bathrooms NUMERIC(3,1) NOT NULL DEFAULT 0,
  max_guests INTEGER NOT NULL DEFAULT 0,
  
  -- Pricing
  nightly_rate NUMERIC(10,2),
  cleaning_fee NUMERIC(10,2),
  service_fee NUMERIC(10,2),
  
  -- Performance
  avg_rating NUMERIC(2,1),
  total_reviews INTEGER DEFAULT 0,
  
  -- Host Info
  host_name TEXT,
  host_since DATE,
  host_listing_count INTEGER,
  host_response_rate NUMERIC(5,2), -- Stored as percentage (e.g., 95.00)
  superhost BOOLEAN DEFAULT FALSE,
  
  -- Amenities & Policies
  amenities TEXT[], -- PostgreSQL array
  instant_book BOOLEAN,
  cancellation_policy TEXT,
  
  -- Lead Classification
  lead_score INTEGER CHECK (lead_score >= 0 AND lead_score <= 100),
  lead_tier TEXT CHECK (lead_tier IN ('strong', 'moderate', 'weak', 'unscored', 'excluded')),
  score_breakdown JSONB, -- Detailed scoring per category
  scored_at TIMESTAMPTZ,
  
  -- Flags & Notes
  flags TEXT[], -- Array of flag strings
  notes TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'excluded', 'merged')),
  collection_source TEXT DEFAULT 'manual' CHECK (collection_source IN ('manual', 'ai_agent', 'csv_import', 'api')),
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRITICAL: Unique constraint for deduplication
-- A listing_id can only exist once per campaign
CREATE UNIQUE INDEX idx_listings_dedup ON public.listings(campaign_id, listing_id);

-- Also prevent the same listing_id for the same user across campaigns
-- (soft dedup — flag but don't block)
CREATE INDEX idx_listings_user_listing_id ON public.listings(user_id, listing_id);

CREATE INDEX idx_listings_campaign ON public.listings(campaign_id);
CREATE INDEX idx_listings_lead_tier ON public.listings(campaign_id, lead_tier);
CREATE INDEX idx_listings_score ON public.listings(campaign_id, lead_score DESC);
CREATE INDEX idx_listings_city_state ON public.listings(city, state);
CREATE INDEX idx_listings_host_name ON public.listings(host_name);

CREATE TRIGGER listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
