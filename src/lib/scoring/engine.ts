/**
 * Deterministic Scoring Engine for ListingScout
 * 
 * Scores listings based on 6 categories:
 * - Location: target market/neighborhood match
 * - Property: bedrooms, bathrooms, guests, amenities
 * - Performance: rating, reviews, rate in range
 * - Host: superhost, response rate, individual, experience
 * - Contact: owner verification + contact methods
 * - Deal: objective alignment + budget match
 * 
 * Each category yields a 0-100% score, weighted by criteria.scoring_weights.
 * Final score = weighted sum. Deterministic: same input = same output.
 */

import { CampaignCriteria } from '@/lib/types/criteria'

export interface ListingData {
  // Location
  city: string
  state: string
  neighborhood: string | null
  
  // Property
  property_type: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  amenities: string[] | null
  
  // Performance
  avg_rating: number | null
  total_reviews: number
  nightly_rate: number | null
  
  // Host
  host_name: string | null
  host_listing_count: number | null
  host_response_rate: number | null
  host_since: string | null
  superhost: boolean
  
  // Owner/Contact (optional, may come from owner research)
  owner_verified?: boolean
  has_email?: boolean
  has_phone?: boolean
  has_linkedin?: boolean
}

export interface ScoreBreakdown {
  location: number
  property: number
  performance: number
  host: number
  contact: number
  deal: number
}

export interface ScoringResult {
  total: number
  breakdown: ScoreBreakdown
  tier: 'strong' | 'moderate' | 'weak' | 'excluded'
  flags: string[]
}

/**
 * Score a listing based on campaign criteria.
 * Deterministic: same listing data + criteria = same result.
 */
export function scoreListing(
  listing: ListingData,
  criteria: CampaignCriteria
): ScoringResult {
  const flags: string[] = []
  
  // Calculate individual category scores (0-100)
  const locationScore = calculateLocationScore(listing, criteria, flags)
  const propertyScore = calculatePropertyScore(listing, criteria, flags)
  const performanceScore = calculatePerformanceScore(listing, criteria, flags)
  const hostScore = calculateHostScore(listing, criteria, flags)
  const contactScore = calculateContactScore(listing, criteria, flags)
  const dealScore = calculateDealScore(listing, criteria, flags)
  
  const breakdown: ScoreBreakdown = {
    location: Math.round(locationScore),
    property: Math.round(propertyScore),
    performance: Math.round(performanceScore),
    host: Math.round(hostScore),
    contact: Math.round(contactScore),
    deal: Math.round(dealScore),
  }
  
  // Calculate weighted total
  const weights = criteria.scoring_weights
  const totalWeight = weights.location + weights.property + weights.performance + 
                      weights.host + weights.contact + weights.deal
  
  // Normalize weights to 100 if they don't sum to 100
  const normalizer = totalWeight > 0 ? 100 / totalWeight : 1
  
  const total = Math.round(
    (locationScore * weights.location +
     propertyScore * weights.property +
     performanceScore * weights.performance +
     hostScore * weights.host +
     contactScore * weights.contact +
     dealScore * weights.deal) * normalizer / 100
  )
  
  // Determine tier
  const tier = determineTier(total, criteria)
  
  return {
    total,
    breakdown,
    tier,
    flags,
  }
}

/**
 * Location Score: Does the listing match target markets and neighborhoods?
 */
function calculateLocationScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  const { location } = criteria
  
  if (location.target_markets.length === 0) {
    // No markets specified = full points
    return 100
  }
  
  // Check if city/state matches any target market
  const listingLocation = `${listing.city}, ${listing.state}`.toLowerCase()
  const cityLower = listing.city.toLowerCase()
  
  let marketMatch = false
  for (const market of location.target_markets) {
    const marketLower = market.toLowerCase()
    if (listingLocation.includes(marketLower) || marketLower.includes(cityLower)) {
      marketMatch = true
      break
    }
  }
  
  if (!marketMatch) {
    flags.push('Not in target market')
    return 0
  }
  
  // Check excluded areas
  for (const excludeArea of location.exclude_areas) {
    if (listingLocation.includes(excludeArea.toLowerCase()) ||
        (listing.neighborhood && listing.neighborhood.toLowerCase().includes(excludeArea.toLowerCase()))) {
      flags.push(`In excluded area: ${excludeArea}`)
      return 0
    }
  }
  
  let score = 70 // Base score for being in target market
  
  // Bonus for matching neighborhood
  if (location.neighborhoods.length > 0 && listing.neighborhood) {
    const neighborhoodLower = listing.neighborhood.toLowerCase()
    for (const targetNeighborhood of location.neighborhoods) {
      if (neighborhoodLower.includes(targetNeighborhood.toLowerCase())) {
        score += 30
        break
      }
    }
  } else if (location.neighborhoods.length === 0) {
    // No specific neighborhoods required
    score += 30
  }
  
  return Math.min(100, score)
}

/**
 * Property Score: Does the listing meet property criteria?
 */
function calculatePropertyScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  const { property } = criteria
  let score = 100
  
  // Property type match
  if (property.types.length > 0) {
    const typeMatches = property.types.some(
      t => listing.property_type.toLowerCase().includes(t.toLowerCase())
    )
    if (!typeMatches) {
      flags.push(`Property type mismatch: ${listing.property_type}`)
      score -= 30
    }
  }
  
  // Bedrooms
  if (listing.bedrooms < property.min_bedrooms) {
    flags.push(`Below min bedrooms: ${listing.bedrooms} < ${property.min_bedrooms}`)
    score -= 25
  }
  
  // Bathrooms
  if (listing.bathrooms < property.min_bathrooms) {
    flags.push(`Below min bathrooms: ${listing.bathrooms} < ${property.min_bathrooms}`)
    score -= 15
  }
  
  // Guests
  if (listing.max_guests < property.min_guests) {
    flags.push(`Below min guests: ${listing.max_guests} < ${property.min_guests}`)
    score -= 15
  }
  
  // Required amenities (hard requirement)
  if (property.required_amenities.length > 0 && listing.amenities) {
    const listingAmenities = listing.amenities.map(a => a.toLowerCase())
    for (const required of property.required_amenities) {
      if (!listingAmenities.some(a => a.includes(required.toLowerCase()))) {
        flags.push(`Missing required amenity: ${required}`)
        score -= 15
      }
    }
  }
  
  // Preferred amenities (bonus)
  if (property.preferred_amenities.length > 0 && listing.amenities) {
    const listingAmenities = listing.amenities.map(a => a.toLowerCase())
    let preferredMatches = 0
    for (const preferred of property.preferred_amenities) {
      if (listingAmenities.some(a => a.includes(preferred.toLowerCase()))) {
        preferredMatches++
      }
    }
    // Each preferred amenity adds a small bonus
    score += Math.min(10, preferredMatches * 2)
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Performance Score: Rating, reviews, and pricing
 */
function calculatePerformanceScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  const { performance } = criteria
  let score = 0
  
  // Rating (40% of performance score)
  if (listing.avg_rating !== null) {
    if (listing.avg_rating >= performance.min_rating) {
      // Full points for meeting minimum, bonus for exceeding
      const ratingScore = Math.min(40, 30 + (listing.avg_rating - performance.min_rating) * 10)
      score += ratingScore
    } else {
      const deficit = performance.min_rating - listing.avg_rating
      score += Math.max(0, 30 - deficit * 15)
      flags.push(`Below min rating: ${listing.avg_rating.toFixed(1)} < ${performance.min_rating}`)
    }
  } else {
    // No rating = assume average
    score += 20
    flags.push('No rating available')
  }
  
  // Reviews (30% of performance score)
  if (listing.total_reviews >= performance.min_reviews) {
    // Full points for meeting minimum, bonus for more
    const reviewScore = Math.min(30, 20 + Math.log10(listing.total_reviews + 1) * 5)
    score += reviewScore
  } else {
    const ratio = listing.total_reviews / performance.min_reviews
    score += Math.max(0, 20 * ratio)
    flags.push(`Below min reviews: ${listing.total_reviews} < ${performance.min_reviews}`)
  }
  
  // Rate in range (30% of performance score)
  if (listing.nightly_rate !== null) {
    if (performance.nightly_rate_max > 0) {
      if (listing.nightly_rate >= performance.nightly_rate_min &&
          listing.nightly_rate <= performance.nightly_rate_max) {
        score += 30
      } else if (listing.nightly_rate < performance.nightly_rate_min) {
        // Below range - might be a deal or low quality
        score += 15
        flags.push(`Below rate range: $${listing.nightly_rate}`)
      } else {
        // Above range
        const overAmount = listing.nightly_rate - performance.nightly_rate_max
        const penaltyPct = Math.min(30, overAmount / performance.nightly_rate_max * 30)
        score += 30 - penaltyPct
        flags.push(`Above rate range: $${listing.nightly_rate}`)
      }
    } else {
      // No rate range specified
      score += 30
    }
  } else {
    score += 15 // No rate available
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Host Score: Superhost status, experience, response rate
 */
function calculateHostScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  const { host } = criteria
  let score = 50 // Base score
  
  // Superhost (up to 30 points)
  if (host.superhost_required && !listing.superhost) {
    flags.push('Superhost required but not met')
    return 0 // Hard requirement not met
  }
  
  if (listing.superhost) {
    score += 30
  } else if (host.superhost_preferred) {
    // Preferred but not present
    score += 0 // No penalty, just no bonus
  }
  
  // Host listing count (up to 10 points)
  if (listing.host_listing_count !== null) {
    if (listing.host_listing_count >= host.min_listings &&
        listing.host_listing_count <= host.max_listings) {
      score += 10
    } else if (listing.host_listing_count < host.min_listings) {
      flags.push(`Host has fewer listings than preferred: ${listing.host_listing_count}`)
    } else if (listing.host_listing_count > host.max_listings) {
      flags.push(`Host has more listings than preferred: ${listing.host_listing_count}`)
    }
  }
  
  // Host experience (up to 10 points)
  if (listing.host_since && host.min_years_hosting > 0) {
    const hostSince = new Date(listing.host_since)
    const yearsHosting = (Date.now() - hostSince.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    
    if (yearsHosting >= host.min_years_hosting) {
      score += 10
    } else {
      const ratio = yearsHosting / host.min_years_hosting
      score += 10 * ratio
      flags.push(`Host experience below preference: ${yearsHosting.toFixed(1)} years`)
    }
  } else if (host.min_years_hosting === 0) {
    score += 10 // No experience requirement
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Contact Score: Owner verification and contact info availability
 */
function calculateContactScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  // Start with base score
  let score = 30
  
  // Owner verified (40 points)
  if (listing.owner_verified) {
    score += 40
  }
  
  // Contact methods (10 points each)
  if (listing.has_email) {
    score += 10
  }
  if (listing.has_phone) {
    score += 10
  }
  if (listing.has_linkedin) {
    score += 10
  }
  
  // If no contact info at all
  if (!listing.owner_verified && !listing.has_email && !listing.has_phone) {
    flags.push('No owner contact info available')
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Deal Score: Alignment with deal objectives
 */
function calculateDealScore(
  listing: ListingData,
  criteria: CampaignCriteria,
  flags: string[]
): number {
  const { deal } = criteria
  
  // For research objective, all listings score high
  if (deal.objective === 'research') {
    return 80
  }
  
  let score = 50
  
  // For acquisition, check budget fit (if we had estimated value data)
  if (deal.objective === 'acquisition') {
    // Without property value data, use nightly rate as proxy
    if (listing.nightly_rate !== null && deal.budget_min > 0 && deal.budget_max > 0) {
      // Rough estimate: annual revenue potential
      const annualRevenue = listing.nightly_rate * 200 // Assume 55% occupancy
      // Typical STR cap rates suggest property value = annual revenue * 8-12x
      const estimatedValue = annualRevenue * 10
      
      if (estimatedValue >= deal.budget_min && estimatedValue <= deal.budget_max) {
        score += 40
      } else if (estimatedValue < deal.budget_min) {
        score += 20 // Could be undervalued
      } else {
        score += Math.max(0, 40 - (estimatedValue - deal.budget_max) / deal.budget_max * 40)
        flags.push('Estimated value above budget')
      }
    } else {
      score += 20 // Can't evaluate budget fit
    }
  }
  
  // For partnership, factor in host profile
  if (deal.objective === 'partnership') {
    if (listing.superhost) {
      score += 25
    }
    if (listing.host_listing_count && listing.host_listing_count >= 3) {
      score += 15 // Experienced operator
    }
  }
  
  return Math.max(0, Math.min(100, score))
}

/**
 * Determine lead tier based on total score and thresholds
 */
function determineTier(
  totalScore: number,
  criteria: CampaignCriteria
): 'strong' | 'moderate' | 'weak' | 'excluded' {
  const { tier_thresholds } = criteria
  
  if (totalScore >= tier_thresholds.strong_min) {
    return 'strong'
  } else if (totalScore <= tier_thresholds.weak_max) {
    return 'weak'
  } else {
    return 'moderate'
  }
}

/**
 * Batch score multiple listings
 */
export function scoreListings(
  listings: ListingData[],
  criteria: CampaignCriteria
): Map<number, ScoringResult> {
  const results = new Map<number, ScoringResult>()
  
  listings.forEach((listing, index) => {
    results.set(index, scoreListing(listing, criteria))
  })
  
  return results
}
