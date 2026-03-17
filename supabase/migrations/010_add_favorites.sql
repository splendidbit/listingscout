-- Add favorites/bookmark column to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_favorited boolean DEFAULT false;
