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
