// Database types for ListingScout.
//
// Hand-written from supabase/migrations/011–014 (the schema rebuild for
// the revenue-share co-host pipeline). When Supabase CLI becomes
// available, this file should be regenerated via:
//   supabase gen types typescript --linked > src/types/database.ts
// and this notice removed.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LeadState =
  | 'discovered'
  | 'market_scored'
  | 'operator_scored'
  | 'matched'
  | 'in_review'
  | 'enrich_light'
  | 'enrich_permit'
  | 'enrich_broker'
  | 'enrich_agent'
  | 'qualified'
  | 'rejected'
  | 'archived'

export type ContactType =
  | 'email'
  | 'phone'
  | 'linkedin'
  | 'website'
  | 'address'
  | 'instagram'
  | 'facebook'
  | 'twitter'
  | 'other'

export type ContactConfidence = 'high' | 'medium' | 'low'

export type ContactSource =
  | 'airbnb'
  | 'permit'
  | 'assessor'
  | 'hunter'
  | 'apollo'
  | 'pdl'
  | 'agent'
  | 'web'
  | 'user_manual'

export type EnrichmentTier = 'light' | 'permit' | 'broker' | 'agent'

export type EnrichmentStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'failed'
  | 'skipped'

export type CrawlRunStatus = 'running' | 'success' | 'failed' | 'ping_ok'

export type BenchmarkSource = 'airroi' | 'airdna'

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          company_name: string | null
          role: 'user' | 'admin' | 'superadmin'
          subscription_tier: 'free' | 'pro' | 'enterprise'
          subscription_status: 'active' | 'trialing' | 'past_due' | 'canceled'
          stripe_customer_id: string | null
          listings_collected_this_month: number
          monthly_listing_limit: number
          campaigns_count: number
          max_campaigns: number
          default_criteria: Json
          notification_preferences: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: 'user' | 'admin' | 'superadmin'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled'
          stripe_customer_id?: string | null
          listings_collected_this_month?: number
          monthly_listing_limit?: number
          campaigns_count?: number
          max_campaigns?: number
          default_criteria?: Json
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          company_name?: string | null
          role?: 'user' | 'admin' | 'superadmin'
          subscription_tier?: 'free' | 'pro' | 'enterprise'
          subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled'
          stripe_customer_id?: string | null
          listings_collected_this_month?: number
          monthly_listing_limit?: number
          campaigns_count?: number
          max_campaigns?: number
          default_criteria?: Json
          notification_preferences?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      metros: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          state: string
          country: string
          airroi_market_id: string | null
          airdna_market_id: string | null
          airbnb_search_config: Json
          permit_registry_config: Json | null
          crawl_enabled: boolean
          crawl_cron: string
          last_crawled_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          state: string
          country?: string
          airroi_market_id?: string | null
          airdna_market_id?: string | null
          airbnb_search_config?: Json
          permit_registry_config?: Json | null
          crawl_enabled?: boolean
          crawl_cron?: string
          last_crawled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          state?: string
          country?: string
          airroi_market_id?: string | null
          airdna_market_id?: string | null
          airbnb_search_config?: Json
          permit_registry_config?: Json | null
          crawl_enabled?: boolean
          crawl_cron?: string
          last_crawled_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      hosts: {
        Row: {
          id: string
          airbnb_host_id: string
          display_name: string | null
          profile_url: string | null
          joined_month: string | null
          superhost: boolean | null
          response_rate_pct: number | null
          identity_verified: boolean | null
          listing_count_observed: number
          excluded: boolean
          exclusion_reason: string | null
          cohost_presence: boolean
          pm_company_detected: boolean
          first_seen_at: string
          last_refreshed_at: string | null
        }
        Insert: {
          id?: string
          airbnb_host_id: string
          display_name?: string | null
          profile_url?: string | null
          joined_month?: string | null
          superhost?: boolean | null
          response_rate_pct?: number | null
          identity_verified?: boolean | null
          listing_count_observed?: number
          excluded?: boolean
          exclusion_reason?: string | null
          cohost_presence?: boolean
          pm_company_detected?: boolean
          first_seen_at?: string
          last_refreshed_at?: string | null
        }
        Update: {
          id?: string
          airbnb_host_id?: string
          display_name?: string | null
          profile_url?: string | null
          joined_month?: string | null
          superhost?: boolean | null
          response_rate_pct?: number | null
          identity_verified?: boolean | null
          listing_count_observed?: number
          excluded?: boolean
          exclusion_reason?: string | null
          cohost_presence?: boolean
          pm_company_detected?: boolean
          first_seen_at?: string
          last_refreshed_at?: string | null
        }
        Relationships: []
      }
      listings: {
        Row: {
          id: string
          airbnb_listing_id: string
          host_id: string
          metro_id: string
          listing_url: string
          title: string | null
          room_type: string | null
          bedrooms: number | null
          bathrooms: number | null
          max_guests: number | null
          neighborhood: string | null
          lat: number | null
          lng: number | null
          photo_count: number | null
          photo_hash: string | null
          nightly_rate: number | null
          cleaning_fee: number | null
          minimum_stay: number | null
          instant_book: boolean | null
          cancellation_policy: string | null
          amenities: Json | null
          amenity_count: number | null
          avg_rating: number | null
          total_reviews: number | null
          sub_ratings: Json | null
          last_review_at: string | null
          description_hash: string | null
          discovered_at: string
          last_refreshed_at: string | null
          raw_payload: Json | null
        }
        Insert: {
          id?: string
          airbnb_listing_id: string
          host_id: string
          metro_id: string
          listing_url: string
          title?: string | null
          room_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          max_guests?: number | null
          neighborhood?: string | null
          lat?: number | null
          lng?: number | null
          photo_count?: number | null
          photo_hash?: string | null
          nightly_rate?: number | null
          cleaning_fee?: number | null
          minimum_stay?: number | null
          instant_book?: boolean | null
          cancellation_policy?: string | null
          amenities?: Json | null
          amenity_count?: number | null
          avg_rating?: number | null
          total_reviews?: number | null
          sub_ratings?: Json | null
          last_review_at?: string | null
          description_hash?: string | null
          discovered_at?: string
          last_refreshed_at?: string | null
          raw_payload?: Json | null
        }
        Update: {
          id?: string
          airbnb_listing_id?: string
          host_id?: string
          metro_id?: string
          listing_url?: string
          title?: string | null
          room_type?: string | null
          bedrooms?: number | null
          bathrooms?: number | null
          max_guests?: number | null
          neighborhood?: string | null
          lat?: number | null
          lng?: number | null
          photo_count?: number | null
          photo_hash?: string | null
          nightly_rate?: number | null
          cleaning_fee?: number | null
          minimum_stay?: number | null
          instant_book?: boolean | null
          cancellation_policy?: string | null
          amenities?: Json | null
          amenity_count?: number | null
          avg_rating?: number | null
          total_reviews?: number | null
          sub_ratings?: Json | null
          last_review_at?: string | null
          description_hash?: string | null
          discovered_at?: string
          last_refreshed_at?: string | null
          raw_payload?: Json | null
        }
        Relationships: []
      }
      listing_snapshots: {
        Row: {
          id: string
          listing_id: string
          snapshot_at: string
          photo_hash: string | null
          description_hash: string | null
          title: string | null
          nightly_rate: number | null
          avg_rating: number | null
          total_reviews: number | null
        }
        Insert: {
          id?: string
          listing_id: string
          snapshot_at?: string
          photo_hash?: string | null
          description_hash?: string | null
          title?: string | null
          nightly_rate?: number | null
          avg_rating?: number | null
          total_reviews?: number | null
        }
        Update: {
          id?: string
          listing_id?: string
          snapshot_at?: string
          photo_hash?: string | null
          description_hash?: string | null
          title?: string | null
          nightly_rate?: number | null
          avg_rating?: number | null
          total_reviews?: number | null
        }
        Relationships: []
      }
      market_benchmarks: {
        Row: {
          metro_id: string
          property_type: string
          bedroom_bucket: number
          source: BenchmarkSource
          market_adr: number | null
          market_occupancy: number | null
          market_revenue: number | null
          market_revpar: number | null
          fetched_at: string
        }
        Insert: {
          metro_id: string
          property_type: string
          bedroom_bucket: number
          source: BenchmarkSource
          market_adr?: number | null
          market_occupancy?: number | null
          market_revenue?: number | null
          market_revpar?: number | null
          fetched_at?: string
        }
        Update: {
          metro_id?: string
          property_type?: string
          bedroom_bucket?: number
          source?: BenchmarkSource
          market_adr?: number | null
          market_occupancy?: number | null
          market_revenue?: number | null
          market_revpar?: number | null
          fetched_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          id: string
          user_id: string
          metro_id: string
          listing_id: string
          host_id: string
          state: LeadState
          upside_score: number | null
          operator_pain_score: number | null
          composite_score: number | null
          score_breakdown: Json | null
          rejection_reason: string | null
          notes: string | null
          scored_at: string | null
          state_changed_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          metro_id: string
          listing_id: string
          host_id: string
          state?: LeadState
          upside_score?: number | null
          operator_pain_score?: number | null
          composite_score?: number | null
          score_breakdown?: Json | null
          rejection_reason?: string | null
          notes?: string | null
          scored_at?: string | null
          state_changed_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          metro_id?: string
          listing_id?: string
          host_id?: string
          state?: LeadState
          upside_score?: number | null
          operator_pain_score?: number | null
          composite_score?: number | null
          score_breakdown?: Json | null
          rejection_reason?: string | null
          notes?: string | null
          scored_at?: string | null
          state_changed_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          id: string
          lead_id: string
          event_type: string
          actor: string
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          lead_id: string
          event_type: string
          actor: string
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          lead_id?: string
          event_type?: string
          actor?: string
          payload?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          id: string
          host_id: string
          contact_type: ContactType
          value: string
          confidence: ContactConfidence
          source: ContactSource
          source_url: string | null
          discovered_at: string
          verified_at: string | null
          stale: boolean
          enrichment_run_id: string | null
        }
        Insert: {
          id?: string
          host_id: string
          contact_type: ContactType
          value: string
          confidence: ContactConfidence
          source: ContactSource
          source_url?: string | null
          discovered_at?: string
          verified_at?: string | null
          stale?: boolean
          enrichment_run_id?: string | null
        }
        Update: {
          id?: string
          host_id?: string
          contact_type?: ContactType
          value?: string
          confidence?: ContactConfidence
          source?: ContactSource
          source_url?: string | null
          discovered_at?: string
          verified_at?: string | null
          stale?: boolean
          enrichment_run_id?: string | null
        }
        Relationships: []
      }
      enrichment_runs: {
        Row: {
          id: string
          lead_id: string
          tier: EnrichmentTier
          status: EnrichmentStatus
          started_at: string
          finished_at: string | null
          cost_usd: number | null
          findings_summary: string | null
          results: Json | null
          error: string | null
          triggered_by: string
        }
        Insert: {
          id?: string
          lead_id: string
          tier: EnrichmentTier
          status: EnrichmentStatus
          started_at?: string
          finished_at?: string | null
          cost_usd?: number | null
          findings_summary?: string | null
          results?: Json | null
          error?: string | null
          triggered_by: string
        }
        Update: {
          id?: string
          lead_id?: string
          tier?: EnrichmentTier
          status?: EnrichmentStatus
          started_at?: string
          finished_at?: string | null
          cost_usd?: number | null
          findings_summary?: string | null
          results?: Json | null
          error?: string | null
          triggered_by?: string
        }
        Relationships: []
      }
      crawl_runs: {
        Row: {
          id: string
          metro_id: string
          started_at: string
          finished_at: string | null
          status: CrawlRunStatus
          listings_discovered: number
          listings_updated: number
          listings_errored: number
          errors: Json | null
        }
        Insert: {
          id?: string
          metro_id: string
          started_at?: string
          finished_at?: string | null
          status?: CrawlRunStatus
          listings_discovered?: number
          listings_updated?: number
          listings_errored?: number
          errors?: Json | null
        }
        Update: {
          id?: string
          metro_id?: string
          started_at?: string
          finished_at?: string | null
          status?: CrawlRunStatus
          listings_discovered?: number
          listings_updated?: number
          listings_errored?: number
          errors?: Json | null
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      lead_state: LeadState
    }
    CompositeTypes: Record<string, never>
  }
}
