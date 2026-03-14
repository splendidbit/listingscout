-- 004_create_owners.sql

CREATE TABLE public.owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Owner Identity
  owner_name TEXT NOT NULL,
  owner_type TEXT DEFAULT 'individual' CHECK (owner_type IN ('individual', 'llc', 'corporation', 'trust', 'unknown')),
  entity_name TEXT, -- Business entity name if applicable
  
  -- Contact Info
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  website TEXT,
  mailing_address TEXT,
  
  -- Verification
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'partial', 'unverified', 'conflicting')),
  verification_sources TEXT[], -- Array of source descriptions
  verification_notes TEXT,
  
  -- Relationship to Listings
  -- (An owner can have multiple listings)
  airbnb_host_name TEXT,
  estimated_listing_count INTEGER,
  
  -- Research metadata
  researched_at TIMESTAMPTZ,
  research_method TEXT, -- 'ai_agent', 'manual', 'public_records'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table: Owner <-> Listing (many-to-many)
CREATE TABLE public.listing_owners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.owners(id) ON DELETE CASCADE,
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(listing_id, owner_id)
);

CREATE INDEX idx_owners_user ON public.owners(user_id);
CREATE INDEX idx_owners_name ON public.owners(owner_name);
CREATE INDEX idx_listing_owners_listing ON public.listing_owners(listing_id);
CREATE INDEX idx_listing_owners_owner ON public.listing_owners(owner_id);

CREATE TRIGGER owners_updated_at
  BEFORE UPDATE ON public.owners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
