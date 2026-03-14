/**
 * Deduplication Engine for ListingScout
 * 
 * Handles detection of duplicate listings using multiple strategies:
 * 1. Exact ID match - Same Airbnb listing ID
 * 2. Address match - Same full address
 * 3. Fuzzy title match - Similar titles in same location
 */

import { createClient } from '@/lib/supabase/server'

export interface DedupResult {
  isDuplicate: boolean
  duplicateType: 'exact_id' | 'address' | 'fuzzy_title' | null
  existingListingId: string | null
  existingCampaignId: string | null
  existingCampaignName: string | null
  confidence: 'high' | 'medium' | 'low'
  message: string
}

export interface ListingInput {
  listing_id: string
  listing_title: string
  city: string
  state: string
  full_address?: string | null
}

/**
 * Check if a listing is a duplicate within a campaign
 */
export async function checkDuplicateInCampaign(
  campaignId: string,
  listing: ListingInput
): Promise<DedupResult> {
  const supabase = await createClient()

  // 1. Check for exact ID match in same campaign
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: exactMatch } = await (supabase as any)
    .from('listings')
    .select('id, listing_id')
    .eq('campaign_id', campaignId)
    .eq('listing_id', listing.listing_id)
    .single()

  if (exactMatch) {
    return {
      isDuplicate: true,
      duplicateType: 'exact_id',
      existingListingId: exactMatch.id,
      existingCampaignId: campaignId,
      existingCampaignName: null,
      confidence: 'high',
      message: `Listing ${listing.listing_id} already exists in this campaign`,
    }
  }

  // 2. Check for address match if address provided
  if (listing.full_address) {
    const normalizedAddress = normalizeAddress(listing.full_address)
    
    const { data: addressMatches } = await (supabase as any)
      .from('listings')
      .select('id, full_address, listing_title')
      .eq('campaign_id', campaignId)
      .not('full_address', 'is', null)

    for (const match of addressMatches || []) {
      if (match.full_address && normalizeAddress(match.full_address) === normalizedAddress) {
        return {
          isDuplicate: true,
          duplicateType: 'address',
          existingListingId: match.id,
          existingCampaignId: campaignId,
          existingCampaignName: null,
          confidence: 'high',
          message: `A listing at the same address already exists: "${match.listing_title}"`,
        }
      }
    }
  }

  // 3. Check for fuzzy title match in same location
  const { data: locationMatches } = await (supabase as any)
    .from('listings')
    .select('id, listing_title')
    .eq('campaign_id', campaignId)
    .eq('city', listing.city)
    .eq('state', listing.state)

  for (const match of locationMatches || []) {
    const similarity = calculateTitleSimilarity(listing.listing_title, match.listing_title)
    if (similarity > 0.85) {
      return {
        isDuplicate: true,
        duplicateType: 'fuzzy_title',
        existingListingId: match.id,
        existingCampaignId: campaignId,
        existingCampaignName: null,
        confidence: 'medium',
        message: `Similar listing found: "${match.listing_title}" (${Math.round(similarity * 100)}% similar)`,
      }
    }
  }

  return {
    isDuplicate: false,
    duplicateType: null,
    existingListingId: null,
    existingCampaignId: null,
    existingCampaignName: null,
    confidence: 'high',
    message: 'No duplicates found',
  }
}

/**
 * Check if a listing exists across all user campaigns
 */
export async function checkDuplicateAcrossCampaigns(
  userId: string,
  listing: ListingInput
): Promise<DedupResult> {
  const supabase = await createClient()

  // Check for exact ID match across all campaigns
  const { data: matches } = await (supabase as any)
    .from('listings')
    .select(`
      id,
      listing_id,
      campaign_id,
      campaigns!inner(name)
    `)
    .eq('user_id', userId)
    .eq('listing_id', listing.listing_id)

  if (matches && matches.length > 0) {
    const match = matches[0]
    const campaign = match.campaigns as unknown as { name: string }
    return {
      isDuplicate: true,
      duplicateType: 'exact_id',
      existingListingId: match.id,
      existingCampaignId: match.campaign_id,
      existingCampaignName: campaign?.name || null,
      confidence: 'high',
      message: `This listing exists in campaign "${campaign?.name || 'Unknown'}"`,
    }
  }

  return {
    isDuplicate: false,
    duplicateType: null,
    existingListingId: null,
    existingCampaignId: null,
    existingCampaignName: null,
    confidence: 'high',
    message: 'No duplicates found across campaigns',
  }
}

/**
 * Batch check multiple listings for duplicates
 */
export async function batchCheckDuplicates(
  campaignId: string,
  listings: ListingInput[]
): Promise<Map<string, DedupResult>> {
  const results = new Map<string, DedupResult>()
  
  // Get all existing listings in the campaign for efficiency
  const supabase = await createClient()
  const { data: existingListings } = await (supabase as any)
    .from('listings')
    .select('id, listing_id, listing_title, city, state, full_address')
    .eq('campaign_id', campaignId)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existingById = new Map(
    (existingListings || []).map((l: any) => [l.listing_id, l])
  )

  for (const listing of listings) {
    // Check exact ID match first (fast)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingExact = existingById.get(listing.listing_id) as any
    if (existingExact) {
      results.set(listing.listing_id, {
        isDuplicate: true,
        duplicateType: 'exact_id',
        existingListingId: existingExact.id,
        existingCampaignId: campaignId,
        existingCampaignName: null,
        confidence: 'high',
        message: `Listing ${listing.listing_id} already exists in this campaign`,
      })
      continue
    }

    // Check fuzzy matches
    let foundDupe = false
    for (const existing of existingListings || []) {
      // Address match
      if (listing.full_address && existing.full_address) {
        if (normalizeAddress(listing.full_address) === normalizeAddress(existing.full_address)) {
          results.set(listing.listing_id, {
            isDuplicate: true,
            duplicateType: 'address',
            existingListingId: existing.id,
            existingCampaignId: campaignId,
            existingCampaignName: null,
            confidence: 'high',
            message: `A listing at the same address already exists`,
          })
          foundDupe = true
          break
        }
      }

      // Title similarity in same location
      if (existing.city === listing.city && existing.state === listing.state) {
        const similarity = calculateTitleSimilarity(listing.listing_title, existing.listing_title)
        if (similarity > 0.85) {
          results.set(listing.listing_id, {
            isDuplicate: true,
            duplicateType: 'fuzzy_title',
            existingListingId: existing.id,
            existingCampaignId: campaignId,
            existingCampaignName: null,
            confidence: 'medium',
            message: `Similar listing found (${Math.round(similarity * 100)}% similar)`,
          })
          foundDupe = true
          break
        }
      }
    }

    if (!foundDupe) {
      results.set(listing.listing_id, {
        isDuplicate: false,
        duplicateType: null,
        existingListingId: null,
        existingCampaignId: null,
        existingCampaignName: null,
        confidence: 'high',
        message: 'No duplicates found',
      })
    }
  }

  return results
}

/**
 * Normalize address for comparison
 */
function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.,#]/g, '')
    .replace(/\bst\b/g, 'street')
    .replace(/\bave\b/g, 'avenue')
    .replace(/\brd\b/g, 'road')
    .replace(/\bdr\b/g, 'drive')
    .replace(/\bln\b/g, 'lane')
    .replace(/\bblvd\b/g, 'boulevard')
    .replace(/\bapt\b/g, 'apartment')
    .replace(/\bunit\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate similarity between two listing titles
 * Uses Jaccard similarity on word tokens
 */
function calculateTitleSimilarity(title1: string, title2: string): number {
  const tokenize = (str: string): Set<string> => {
    return new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2) // Ignore short words
    )
  }

  const tokens1 = tokenize(title1)
  const tokens2 = tokenize(title2)

  if (tokens1.size === 0 || tokens2.size === 0) return 0

  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)))
  const union = new Set([...tokens1, ...tokens2])

  return intersection.size / union.size
}
