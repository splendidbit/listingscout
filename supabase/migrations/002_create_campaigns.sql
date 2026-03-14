-- 002_create_campaigns.sql

-- A campaign is a research project targeting a specific market/criteria set
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Identity
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  
  -- Target Criteria (the heart of the system)
  criteria JSONB NOT NULL DEFAULT '{}'::JSONB,
  /*
    criteria JSONB structure:
    {
      "location": {
        "target_markets": ["Austin, TX", "Nashville, TN"],
        "neighborhoods": ["Downtown", "East Nashville"],
        "exclude_areas": ["Rural outskirts"],
        "radius_miles": 10
      },
      "property": {
        "types": ["entire_home", "condo", "townhouse"],
        "min_bedrooms": 2,
        "min_bathrooms": 1,
        "min_guests": 4,
        "required_amenities": ["wifi", "pool", "self_checkin"],
        "preferred_amenities": ["hot_tub", "workspace"]
      },
      "performance": {
        "min_reviews": 10,
        "min_rating": 4.5,
        "min_occupancy_pct": 60,
        "nightly_rate_min": 150,
        "nightly_rate_max": 400
      },
      "host": {
        "preferred_type": "individual",
        "superhost_required": false,
        "superhost_preferred": true,
        "min_listings": 1,
        "max_listings": 10
      },
      "deal": {
        "objective": "acquisition",
        "budget_min": 200000,
        "budget_max": 500000,
        "preferred_contact": "email"
      },
      "scoring_weights": {
        "location": 20,
        "property": 15,
        "performance": 20,
        "host": 15,
        "contact": 15,
        "deal": 15
      },
      "tier_thresholds": {
        "strong_min": 70,
        "weak_max": 39
      }
    }
  */
  
  -- Google Sheets sync (optional)
  google_sheet_id TEXT,
  sheets_sync_enabled BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ,
  
  -- Stats (denormalized for dashboard performance)
  total_listings INTEGER DEFAULT 0,
  strong_leads INTEGER DEFAULT 0,
  moderate_leads INTEGER DEFAULT 0,
  weak_leads INTEGER DEFAULT 0,
  owners_found INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);

CREATE TRIGGER campaigns_updated_at
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
