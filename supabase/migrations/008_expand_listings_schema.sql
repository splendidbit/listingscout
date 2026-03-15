-- Migration 008: Expand listings schema for consulting lead qualification system
-- All columns are nullable to avoid breaking existing rows

-- Host intelligence
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_listing_count integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_profile_url text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_join_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_response_rate numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_response_time text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_type text; -- 'diy' | 'scaling' | 'professional'

-- Pricing signals
ALTER TABLE listings ADD COLUMN IF NOT EXISTS cleaning_fee numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS minimum_stay integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS maximum_stay integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS instant_book boolean;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS calendar_availability_365 integer;

-- Performance estimates
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimated_occupancy_rate numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimated_annual_revenue numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS estimated_monthly_revenue numeric;

-- Market comparison
ALTER TABLE listings ADD COLUMN IF NOT EXISTS market_avg_price numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS market_avg_occupancy numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS market_avg_revenue numeric;

-- Review signals
ALTER TABLE listings ADD COLUMN IF NOT EXISTS reviews_per_month numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS last_review_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_cleanliness numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_accuracy numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_communication numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_location numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_checkin numeric;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS rating_value numeric;

-- Listing quality signals
ALTER TABLE listings ADD COLUMN IF NOT EXISTS photo_count integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS title_length integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS description_length integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS amenities_count integer;

-- Calendar signals
ALTER TABLE listings ADD COLUMN IF NOT EXISTS days_available_next_90 integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS days_available_next_365 integer;

-- Calculated opportunity scores (0-100)
ALTER TABLE listings ADD COLUMN IF NOT EXISTS revenue_potential_score integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pricing_opportunity_score integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_quality_score integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS review_momentum_score integer;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS competition_pressure_score integer;

-- AI analysis output
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_lead_score integer; -- 1-10
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_bucket text; -- 'pricing_opportunity' | 'optimization_opportunity' | 'multi_listing_host' | 'weak_lead' | 'strong_lead'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS opportunity_notes text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS outreach_angle text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_confidence numeric; -- 0-1
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz;

-- Outreach intelligence
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_instagram text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_linkedin text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS host_company_name text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS property_management_company text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_phone text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_source text;

-- Pipeline tracking
ALTER TABLE listings ADD COLUMN IF NOT EXISTS lead_status text DEFAULT 'new'; -- 'new' | 'qualified' | 'contacted' | 'responded' | 'meeting_booked' | 'closed' | 'not_interested'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS date_contacted date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contact_method text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS follow_up_date date;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS outreach_notes text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deal_value_estimate numeric;
