-- Add favorites/bookmark column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_favorited boolean DEFAULT false;

-- Partial index for efficient favorite-filtered queries
CREATE INDEX IF NOT EXISTS idx_listings_favorited
  ON public.listings (campaign_id)
  WHERE is_favorited = true;
