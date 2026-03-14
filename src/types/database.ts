export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

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
      }
      campaigns: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          criteria: Json
          google_sheet_id: string | null
          sheets_sync_enabled: boolean
          last_synced_at: string | null
          total_listings: number
          strong_leads: number
          moderate_leads: number
          weak_leads: number
          owners_found: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          criteria?: Json
          google_sheet_id?: string | null
          sheets_sync_enabled?: boolean
          last_synced_at?: string | null
          total_listings?: number
          strong_leads?: number
          moderate_leads?: number
          weak_leads?: number
          owners_found?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          status?: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
          criteria?: Json
          google_sheet_id?: string | null
          sheets_sync_enabled?: boolean
          last_synced_at?: string | null
          total_listings?: number
          strong_leads?: number
          moderate_leads?: number
          weak_leads?: number
          owners_found?: number
          created_at?: string
          updated_at?: string
        }
      }
      listings: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          listing_id: string
          listing_url: string
          listing_title: string
          property_type: string
          city: string
          state: string
          neighborhood: string | null
          full_address: string | null
          latitude: number | null
          longitude: number | null
          bedrooms: number
          bathrooms: number
          max_guests: number
          nightly_rate: number | null
          cleaning_fee: number | null
          service_fee: number | null
          avg_rating: number | null
          total_reviews: number
          host_name: string | null
          host_since: string | null
          host_listing_count: number | null
          host_response_rate: number | null
          superhost: boolean
          amenities: string[] | null
          instant_book: boolean | null
          cancellation_policy: string | null
          lead_score: number | null
          lead_tier: 'strong' | 'moderate' | 'weak' | 'unscored' | 'excluded' | null
          score_breakdown: Json | null
          scored_at: string | null
          flags: string[] | null
          notes: string | null
          status: 'active' | 'archived' | 'excluded' | 'merged'
          collection_source: 'manual' | 'ai_agent' | 'csv_import' | 'api'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          listing_id: string
          listing_url: string
          listing_title: string
          property_type: string
          city: string
          state: string
          neighborhood?: string | null
          full_address?: string | null
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number
          bathrooms?: number
          max_guests?: number
          nightly_rate?: number | null
          cleaning_fee?: number | null
          service_fee?: number | null
          avg_rating?: number | null
          total_reviews?: number
          host_name?: string | null
          host_since?: string | null
          host_listing_count?: number | null
          host_response_rate?: number | null
          superhost?: boolean
          amenities?: string[] | null
          instant_book?: boolean | null
          cancellation_policy?: string | null
          lead_score?: number | null
          lead_tier?: 'strong' | 'moderate' | 'weak' | 'unscored' | 'excluded' | null
          score_breakdown?: Json | null
          scored_at?: string | null
          flags?: string[] | null
          notes?: string | null
          status?: 'active' | 'archived' | 'excluded' | 'merged'
          collection_source?: 'manual' | 'ai_agent' | 'csv_import' | 'api'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          listing_id?: string
          listing_url?: string
          listing_title?: string
          property_type?: string
          city?: string
          state?: string
          neighborhood?: string | null
          full_address?: string | null
          latitude?: number | null
          longitude?: number | null
          bedrooms?: number
          bathrooms?: number
          max_guests?: number
          nightly_rate?: number | null
          cleaning_fee?: number | null
          service_fee?: number | null
          avg_rating?: number | null
          total_reviews?: number
          host_name?: string | null
          host_since?: string | null
          host_listing_count?: number | null
          host_response_rate?: number | null
          superhost?: boolean
          amenities?: string[] | null
          instant_book?: boolean | null
          cancellation_policy?: string | null
          lead_score?: number | null
          lead_tier?: 'strong' | 'moderate' | 'weak' | 'unscored' | 'excluded' | null
          score_breakdown?: Json | null
          scored_at?: string | null
          flags?: string[] | null
          notes?: string | null
          status?: 'active' | 'archived' | 'excluded' | 'merged'
          collection_source?: 'manual' | 'ai_agent' | 'csv_import' | 'api'
          created_at?: string
          updated_at?: string
        }
      }
      owners: {
        Row: {
          id: string
          user_id: string
          owner_name: string
          owner_type: 'individual' | 'llc' | 'corporation' | 'trust' | 'unknown'
          entity_name: string | null
          email: string | null
          phone: string | null
          linkedin_url: string | null
          website: string | null
          mailing_address: string | null
          verification_status: 'verified' | 'partial' | 'unverified' | 'conflicting'
          verification_sources: string[] | null
          verification_notes: string | null
          airbnb_host_name: string | null
          estimated_listing_count: number | null
          researched_at: string | null
          research_method: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          owner_name: string
          owner_type?: 'individual' | 'llc' | 'corporation' | 'trust' | 'unknown'
          entity_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          website?: string | null
          mailing_address?: string | null
          verification_status?: 'verified' | 'partial' | 'unverified' | 'conflicting'
          verification_sources?: string[] | null
          verification_notes?: string | null
          airbnb_host_name?: string | null
          estimated_listing_count?: number | null
          researched_at?: string | null
          research_method?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          owner_name?: string
          owner_type?: 'individual' | 'llc' | 'corporation' | 'trust' | 'unknown'
          entity_name?: string | null
          email?: string | null
          phone?: string | null
          linkedin_url?: string | null
          website?: string | null
          mailing_address?: string | null
          verification_status?: 'verified' | 'partial' | 'unverified' | 'conflicting'
          verification_sources?: string[] | null
          verification_notes?: string | null
          airbnb_host_name?: string | null
          estimated_listing_count?: number | null
          researched_at?: string | null
          research_method?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      listing_owners: {
        Row: {
          id: string
          listing_id: string
          owner_id: string
          confidence: 'high' | 'medium' | 'low'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          owner_id: string
          confidence?: 'high' | 'medium' | 'low'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          owner_id?: string
          confidence?: 'high' | 'medium' | 'low'
          notes?: string | null
          created_at?: string
        }
      }
      audit_log: {
        Row: {
          id: string
          user_id: string
          campaign_id: string | null
          action: string
          entity_type: string | null
          entity_id: string | null
          details: Json
          previous_value: Json | null
          new_value: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          campaign_id?: string | null
          action: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json
          previous_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          campaign_id?: string | null
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          details?: Json
          previous_value?: Json | null
          new_value?: Json | null
          created_at?: string
        }
      }
    }
    Functions: {
      check_listing_duplicate: {
        Args: {
          p_campaign_id: string
          p_listing_id: string
          p_user_id: string
        }
        Returns: {
          is_duplicate: boolean
          existing_campaign_id: string | null
          existing_campaign_name: string | null
          existing_internal_id: string | null
        }[]
      }
      refresh_campaign_stats: {
        Args: {
          p_campaign_id: string
        }
        Returns: undefined
      }
      classify_listings: {
        Args: {
          p_campaign_id: string
        }
        Returns: {
          strong_count: number
          moderate_count: number
          weak_count: number
        }[]
      }
    }
  }
}
