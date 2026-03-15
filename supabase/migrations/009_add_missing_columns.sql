-- 009_add_missing_columns.sql
-- Add all columns missing from original schema that are needed by AirROI integration

-- Core missing columns
ALTER TABLE listings ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS room_type TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS annual_revenue numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS occupancy_rate numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_id TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS raw_data JSONB;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS amenities_count INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_count INTEGER;

-- AirROI performance fields
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ttm_revenue numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ttm_occupancy numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ttm_avg_rate numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS l90d_revenue numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS l90d_occupancy numeric;

-- collection_source needs to support 'airroi'
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_collection_source_check;
ALTER TABLE listings ADD CONSTRAINT listings_collection_source_check 
  CHECK (collection_source IN ('manual', 'ai_agent', 'csv_import', 'api', 'airroi', 'airdna'));
