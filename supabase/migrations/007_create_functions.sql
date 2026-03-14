-- 007_create_functions.sql

-- Function: Check for duplicates before insert
CREATE OR REPLACE FUNCTION public.check_listing_duplicate(
  p_campaign_id UUID,
  p_listing_id TEXT,
  p_user_id UUID
)
RETURNS TABLE(
  is_duplicate BOOLEAN,
  existing_campaign_id UUID,
  existing_campaign_name TEXT,
  existing_internal_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    TRUE AS is_duplicate,
    l.campaign_id AS existing_campaign_id,
    c.name AS existing_campaign_name,
    l.id AS existing_internal_id
  FROM public.listings l
  JOIN public.campaigns c ON c.id = l.campaign_id
  WHERE l.listing_id = p_listing_id
    AND l.user_id = p_user_id
    AND l.status != 'excluded'
  LIMIT 1;
  
  -- If no rows returned, return a "not duplicate" row
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::UUID;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update campaign stats (call after listing changes)
CREATE OR REPLACE FUNCTION public.refresh_campaign_stats(p_campaign_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.campaigns SET
    total_listings = (
      SELECT COUNT(*) FROM public.listings
      WHERE campaign_id = p_campaign_id AND status = 'active'
    ),
    strong_leads = (
      SELECT COUNT(*) FROM public.listings
      WHERE campaign_id = p_campaign_id AND lead_tier = 'strong' AND status = 'active'
    ),
    moderate_leads = (
      SELECT COUNT(*) FROM public.listings
      WHERE campaign_id = p_campaign_id AND lead_tier = 'moderate' AND status = 'active'
    ),
    weak_leads = (
      SELECT COUNT(*) FROM public.listings
      WHERE campaign_id = p_campaign_id AND lead_tier = 'weak' AND status = 'active'
    ),
    owners_found = (
      SELECT COUNT(DISTINCT lo.owner_id)
      FROM public.listing_owners lo
      JOIN public.listings l ON l.id = lo.listing_id
      WHERE l.campaign_id = p_campaign_id AND l.status = 'active'
    ),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Bulk move listings between tiers
CREATE OR REPLACE FUNCTION public.classify_listings(p_campaign_id UUID)
RETURNS TABLE(strong_count INT, moderate_count INT, weak_count INT) AS $$
DECLARE
  v_criteria JSONB;
  v_strong_min INT;
  v_weak_max INT;
BEGIN
  -- Get tier thresholds from campaign criteria
  SELECT criteria INTO v_criteria FROM public.campaigns WHERE id = p_campaign_id;
  v_strong_min := COALESCE((v_criteria->'tier_thresholds'->>'strong_min')::INT, 70);
  v_weak_max := COALESCE((v_criteria->'tier_thresholds'->>'weak_max')::INT, 39);
  
  -- Classify all scored listings
  UPDATE public.listings SET
    lead_tier = CASE
      WHEN lead_score >= v_strong_min THEN 'strong'
      WHEN lead_score <= v_weak_max THEN 'weak'
      ELSE 'moderate'
    END
  WHERE campaign_id = p_campaign_id
    AND lead_score IS NOT NULL
    AND status = 'active';
  
  -- Return counts
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::INT FROM public.listings WHERE campaign_id = p_campaign_id AND lead_tier = 'strong' AND status = 'active'),
    (SELECT COUNT(*)::INT FROM public.listings WHERE campaign_id = p_campaign_id AND lead_tier = 'moderate' AND status = 'active'),
    (SELECT COUNT(*)::INT FROM public.listings WHERE campaign_id = p_campaign_id AND lead_tier = 'weak' AND status = 'active');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
