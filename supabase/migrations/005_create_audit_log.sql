-- 005_create_audit_log.sql

CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  -- What happened
  action TEXT NOT NULL,
  /* Actions:
    'listing.created', 'listing.updated', 'listing.scored', 'listing.tier_changed',
    'listing.excluded', 'listing.duplicate_detected',
    'owner.created', 'owner.updated', 'owner.verified',
    'campaign.created', 'campaign.criteria_updated',
    'export.sheets_sync', 'export.csv',
    'ai.research_started', 'ai.research_completed',
    'scoring.batch_started', 'scoring.batch_completed'
  */
  
  -- Context
  entity_type TEXT, -- 'listing', 'owner', 'campaign', 'export'
  entity_id UUID,
  
  -- Details
  details JSONB DEFAULT '{}'::JSONB, -- Arbitrary metadata
  previous_value JSONB, -- Before state (for updates)
  new_value JSONB, -- After state (for updates)
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON public.audit_log(user_id);
CREATE INDEX idx_audit_campaign ON public.audit_log(campaign_id);
CREATE INDEX idx_audit_action ON public.audit_log(action);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
