-- 006_create_rls_policies.sql

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- PROFILES: Users can only read/update their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- CAMPAIGNS: Users can only CRUD their own campaigns
CREATE POLICY "campaigns_select_own" ON public.campaigns
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "campaigns_insert_own" ON public.campaigns
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "campaigns_update_own" ON public.campaigns
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "campaigns_delete_own" ON public.campaigns
  FOR DELETE USING (auth.uid() = user_id);

-- LISTINGS: Users can only CRUD listings in their own campaigns
CREATE POLICY "listings_select_own" ON public.listings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "listings_insert_own" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "listings_update_own" ON public.listings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "listings_delete_own" ON public.listings
  FOR DELETE USING (auth.uid() = user_id);

-- OWNERS: Users can only CRUD their own discovered owners
CREATE POLICY "owners_select_own" ON public.owners
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "owners_insert_own" ON public.owners
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "owners_update_own" ON public.owners
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "owners_delete_own" ON public.owners
  FOR DELETE USING (auth.uid() = user_id);

-- LISTING_OWNERS: Access through listing ownership
CREATE POLICY "listing_owners_select" ON public.listing_owners
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_owners.listing_id
      AND listings.user_id = auth.uid()
    )
  );
CREATE POLICY "listing_owners_insert" ON public.listing_owners
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.listings
      WHERE listings.id = listing_owners.listing_id
      AND listings.user_id = auth.uid()
    )
  );

-- AUDIT LOG: Users can only read their own logs
CREATE POLICY "audit_select_own" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "audit_insert_own" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
