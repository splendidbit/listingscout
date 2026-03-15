-- Add columns missing from original schema
ALTER TABLE listings ADD COLUMN IF NOT EXISTS annual_revenue numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS occupancy_rate numeric;
