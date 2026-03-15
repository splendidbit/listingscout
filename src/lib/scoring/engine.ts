/**
 * Revenue Potential Scoring Engine for ListingScout
 *
 * Scores STR listings for consulting lead qualification.
 * Answers 3 questions per listing:
 *   1. Is the host a DIY operator or professional?
 *   2. Is there measurable revenue upside?
 *   3. Is the host worth contacting?
 *
 * Deterministic: same inputs always produce the same outputs.
 */

// ─── Input Types ─────────────────────────────────────────────────────────────

export interface ListingData {
  // Identity
  listing_id?: string
  listing_url?: string
  listing_title?: string

  // Property
  room_type?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  max_guests?: number | null
  amenities?: string[] | null
  amenities_count?: number | null
  photo_count?: number | null
  description_length?: number | null
  title_length?: number | null

  // Host
  host_listing_count?: number | null
  superhost?: boolean | null
  host_response_rate?: number | null

  // Pricing
  nightly_rate?: number | null
  ttm_avg_rate?: number | null
  cleaning_fee?: number | null
  minimum_stay?: number | null
  instant_book?: boolean | null

  // Performance
  avg_rating?: number | null
  total_reviews?: number | null
  reviews_per_month?: number | null
  occupancy_rate?: number | null
  ttm_occupancy?: number | null
  annual_revenue?: number | null
  ttm_revenue?: number | null

  // Sub-ratings
  rating_cleanliness?: number | null
  rating_accuracy?: number | null
  rating_communication?: number | null
  rating_location?: number | null
  rating_checkin?: number | null
  rating_value?: number | null

  // Market comparison (injected from /markets/summary)
  market_avg_price?: number | null
  market_avg_occupancy?: number | null
  market_avg_revenue?: number | null

  // Location
  city?: string | null
  state?: string | null
}

export interface MarketData {
  average_daily_rate?: number | null
  occupancy?: number | null
  revenue?: number | null
  active_listings_count?: number | null
}

// ─── Output Types ─────────────────────────────────────────────────────────────

export type HostType = 'diy' | 'scaling' | 'professional'
export type AiBucket =
  | 'strong_lead'
  | 'pricing_opportunity'
  | 'optimization_opportunity'
  | 'multi_listing_host'
  | 'weak_lead'
export type LeadTier = 'strong' | 'moderate' | 'weak' | 'excluded'

export interface ScoringResult {
  revenue_potential_score: number      // 0-100, primary score
  pricing_opportunity_score: number    // 0-100
  listing_quality_score: number        // 0-100 (gap = 100 - this)
  review_momentum_score: number        // 0-100
  competition_pressure_score: number   // 0-100
  host_type: HostType
  ai_bucket: AiBucket
  lead_tier: LeadTier
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function getEffectiveRate(listing: ListingData): number | null {
  return listing.nightly_rate ?? listing.ttm_avg_rate ?? null
}

function getEffectiveOccupancy(listing: ListingData): number | null {
  return listing.occupancy_rate ?? listing.ttm_occupancy ?? null
}

function getEffectiveRevenue(listing: ListingData): number | null {
  return listing.annual_revenue ?? listing.ttm_revenue ?? null
}

// ─── Sub-scores ───────────────────────────────────────────────────────────────

/**
 * Market Demand Score (0-100)
 * Strong market = high base demand for the consultant's pitch
 */
function calcMarketDemandScore(listing: ListingData): number {
  const marketOccupancy = listing.market_avg_occupancy ?? null
  const marketRevenue = listing.market_avg_revenue ?? null

  if (marketOccupancy === null && marketRevenue === null) {
    // No market data — assume moderate
    return 50
  }

  let score = 0
  let parts = 0

  if (marketOccupancy !== null) {
    // occupancy 0-1 scale or 0-100 scale — normalise
    const occ = marketOccupancy > 1 ? marketOccupancy / 100 : marketOccupancy
    // >70% = excellent, 50-70% = good, <50% = weak
    const occScore = clamp(occ * 140) // 0.7 → 98, 0.5 → 70, 0.3 → 42
    score += occScore
    parts++
  }

  if (marketRevenue !== null) {
    // >$50k/yr market avg = strong, <$20k = weak
    const revScore = clamp((marketRevenue / 50000) * 100)
    score += revScore
    parts++
  }

  return parts > 0 ? clamp(score / parts) : 50
}

/**
 * Listing Quality Gap Score (0-100)
 * High score = many quality issues = big improvement opportunity
 */
function calcListingQualityGapScore(listing: ListingData): number {
  let gap = 0

  // Photo count (0-30 points)
  const photos = listing.photo_count ?? null
  if (photos !== null) {
    if (photos < 5) gap += 30
    else if (photos < 10) gap += 22
    else if (photos < 15) gap += 15
    else if (photos < 20) gap += 8
    // >= 20 photos = no gap
  } else {
    gap += 15 // unknown = assume some gap
  }

  // Amenities (0-20 points)
  const amenCount = listing.amenities_count ?? (listing.amenities?.length ?? null)
  if (amenCount !== null) {
    if (amenCount < 4) gap += 20
    else if (amenCount < 8) gap += 12
    else if (amenCount < 12) gap += 6
  } else {
    gap += 10
  }

  // Description length (0-20 points)
  const descLen = listing.description_length ?? null
  if (descLen !== null) {
    if (descLen < 100) gap += 20
    else if (descLen < 300) gap += 12
    else if (descLen < 500) gap += 5
  } else {
    gap += 10
  }

  // Sub-ratings (0-30 points)
  const subRatings = [
    listing.rating_cleanliness,
    listing.rating_communication,
    listing.rating_accuracy,
    listing.rating_checkin,
    listing.rating_value,
  ].filter((r): r is number => r !== null && r !== undefined)

  if (subRatings.length > 0) {
    const avgSubRating = subRatings.reduce((a, b) => a + b, 0) / subRatings.length
    // Below 4.5 = has room to improve
    if (avgSubRating < 4.0) gap += 30
    else if (avgSubRating < 4.4) gap += 20
    else if (avgSubRating < 4.6) gap += 10
    else if (avgSubRating < 4.8) gap += 5
  } else {
    gap += 15
  }

  return clamp(gap)
}

/**
 * Pricing Gap Score (0-100)
 * High score = listing is significantly underpriced vs market
 */
function calcPricingGapScore(listing: ListingData): number {
  const rate = getEffectiveRate(listing)
  const marketPrice = listing.market_avg_price ?? null

  if (rate === null || marketPrice === null || marketPrice <= 0) {
    return 30 // No market data — some opportunity assumed
  }

  if (rate >= marketPrice) {
    // At or above market — no pricing gap, but still might be priced wrong seasonally
    return 10
  }

  // Gap percentage: how far below market are they?
  const gapPct = (marketPrice - rate) / marketPrice // 0 to 1

  // >30% below = maximum score, 20-30% = high, 10-20% = moderate, <10% = low
  if (gapPct >= 0.3) return 100
  if (gapPct >= 0.2) return clamp(70 + (gapPct - 0.2) / 0.1 * 30)
  if (gapPct >= 0.1) return clamp(40 + (gapPct - 0.1) / 0.1 * 30)
  return clamp(gapPct / 0.1 * 40)
}

/**
 * Review Momentum Score (0-100)
 * Sweet spot: 10-80 reviews (traction established, still has growth upside)
 */
function calcReviewMomentumScore(listing: ListingData): number {
  const reviews = listing.total_reviews ?? 0
  const rating = listing.avg_rating ?? null
  const perMonth = listing.reviews_per_month ?? null

  let score = 0

  // Review count sweet spot (0-50 pts)
  if (reviews >= 10 && reviews <= 80) {
    // Perfect zone
    score += 50
  } else if (reviews > 80 && reviews <= 200) {
    // Established, less upside
    score += 30
  } else if (reviews > 200) {
    // Very established, probably optimised
    score += 10
  } else if (reviews >= 3) {
    // Getting started
    score += 25
  } else {
    // Too few — hard to qualify
    score += 5
  }

  // Rating sweet spot 4.4-4.8 (0-30 pts)
  // These hosts are doing okay but not excellent — most improvable
  if (rating !== null) {
    if (rating >= 4.4 && rating <= 4.8) {
      score += 30
    } else if (rating > 4.8) {
      // Nearly perfect — still some upside
      score += 20
    } else if (rating >= 4.0 && rating < 4.4) {
      // Needs work — could improve with help
      score += 15
    } else if (rating < 4.0) {
      // Low rating — risky lead
      score += 5
    }
  } else {
    score += 15
  }

  // reviews_per_month trend (0-20 pts)
  if (perMonth !== null) {
    if (perMonth >= 3) score += 20
    else if (perMonth >= 1) score += 14
    else if (perMonth >= 0.5) score += 8
    else score += 3
  } else {
    score += 10 // unknown
  }

  return clamp(score)
}

/**
 * Host Size Indicator (0-100)
 * DIY hosts are our ideal targets
 */
function calcHostSizeScore(listing: ListingData): number {
  const count = listing.host_listing_count ?? null

  if (count === null) return 60 // Unknown — assume DIY

  if (count <= 3) return 100
  if (count <= 9) return 50
  return 0 // 10+ = professional, not our target
}

// ─── Host Type Classification ──────────────────────────────────────────────────

function classifyHostType(listing: ListingData): HostType {
  const count = listing.host_listing_count ?? null
  if (count === null) return 'diy' // assume DIY if unknown
  if (count <= 3) return 'diy'
  if (count <= 9) return 'scaling'
  return 'professional'
}

// ─── Ideal Lead Profile ────────────────────────────────────────────────────────

function matchesIdealProfile(listing: ListingData): boolean {
  const roomType = (listing.room_type ?? '').toLowerCase()
  const bedrooms = listing.bedrooms ?? 0
  const hostCount = listing.host_listing_count ?? 1
  const reviews = listing.total_reviews ?? 0
  const rating = listing.avg_rating ?? null

  return (
    roomType.includes('entire') &&
    bedrooms >= 2 &&
    bedrooms <= 6 &&
    hostCount <= 3 &&
    reviews < 80 &&
    (rating === null || (rating >= 4.4 && rating <= 4.8))
  )
}

// ─── AI Bucket Assignment ──────────────────────────────────────────────────────

function assignBucket(
  listing: ListingData,
  pricingGapScore: number,
  qualityGapScore: number,
  marketDemandScore: number,
  hostType: HostType,
  revenuePotentialScore: number
): AiBucket {
  // Weak lead: professional or very low reviews or very low rating
  if (
    hostType === 'professional' ||
    (listing.total_reviews ?? 0) < 3 ||
    (listing.avg_rating != null && listing.avg_rating < 3.5)
  ) {
    return 'weak_lead'
  }

  // Strong lead: matches ideal profile and high score
  if (matchesIdealProfile(listing) && revenuePotentialScore >= 65) {
    return 'strong_lead'
  }

  // Pricing opportunity: underpriced in a strong market
  if (pricingGapScore >= 70 && marketDemandScore >= 60) {
    return 'pricing_opportunity'
  }

  // Multi-listing host: scaling operators (4-9 listings)
  if (hostType === 'scaling') {
    return 'multi_listing_host'
  }

  // Optimization opportunity: quality gap is major, moderate reviews
  if (qualityGapScore >= 40) {
    return 'optimization_opportunity'
  }

  // Default for everyone else with decent scores
  if (revenuePotentialScore >= 40) {
    return 'pricing_opportunity'
  }

  return 'weak_lead'
}

// ─── Main Scoring Function ────────────────────────────────────────────────────

/**
 * Score a listing for consulting lead qualification.
 * Deterministic: same inputs always produce the same outputs.
 */
export function scoreListing(listing: ListingData): ScoringResult {
  // Calculate component scores
  const marketDemandScore = calcMarketDemandScore(listing)
  const qualityGapScore = calcListingQualityGapScore(listing)
  const pricingGapScore = calcPricingGapScore(listing)
  const reviewMomentumScore = calcReviewMomentumScore(listing)
  const hostSizeScore = calcHostSizeScore(listing)

  // Listing quality score = inverse of gap (good listings score high here)
  const listingQualityScore = clamp(100 - qualityGapScore)

  // Competition pressure score — higher market demand = more competition = higher pressure
  // Hosts in competitive markets are more likely to need help standing out
  const competitionPressureScore = clamp(marketDemandScore * 0.8 + (listing.market_avg_occupancy
    ? (listing.market_avg_occupancy > 1 ? listing.market_avg_occupancy : listing.market_avg_occupancy * 100) * 0.5
    : 0))

  // Revenue Potential Score — weighted combination
  // Weights: market demand 20%, quality gap 20%, pricing gap 25%, review momentum 20%, host size 15%
  const revenuePotentialScore = clamp(
    marketDemandScore * 0.20 +
    qualityGapScore * 0.20 +
    pricingGapScore * 0.25 +
    reviewMomentumScore * 0.20 +
    hostSizeScore * 0.15
  )

  // Host classification
  const hostType = classifyHostType(listing)

  // AI bucket
  const aiBucket = assignBucket(
    listing,
    pricingGapScore,
    qualityGapScore,
    marketDemandScore,
    hostType,
    revenuePotentialScore
  )

  // Lead tier based on revenue potential score
  let leadTier: LeadTier
  if (hostType === 'professional') {
    leadTier = 'excluded'
  } else if (revenuePotentialScore >= 70) {
    leadTier = 'strong'
  } else if (revenuePotentialScore >= 40) {
    leadTier = 'moderate'
  } else {
    leadTier = 'weak'
  }

  return {
    revenue_potential_score: Math.round(revenuePotentialScore),
    pricing_opportunity_score: Math.round(pricingGapScore),
    listing_quality_score: Math.round(listingQualityScore),
    review_momentum_score: Math.round(reviewMomentumScore),
    competition_pressure_score: Math.round(competitionPressureScore),
    host_type: hostType,
    ai_bucket: aiBucket,
    lead_tier: leadTier,
  }
}

/**
 * Score multiple listings at once.
 */
export function scoreListings(listings: ListingData[]): ScoringResult[] {
  return listings.map(scoreListing)
}
