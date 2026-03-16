/**
 * Opportunity Scoring Engine for ListingScout
 *
 * Scores STR listings for revenue optimization opportunity detection.
 * The Opportunity Score answers: "How much revenue upside does this listing have?"
 *
 * - High score = good host, functional listing, but clear pricing/optimization inefficiencies
 * - Low score = already well-optimized OR poor listing unlikely to convert to client
 * - A perfectly optimized listing should score LOW
 * - Poor listings with no traction should also score LOW
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
  professional_management?: boolean | null
  cohost_presence?: boolean | null

  // Pricing
  nightly_rate?: number | null
  ttm_avg_rate?: number | null
  l90d_avg_rate?: number | null
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
  l90d_revenue?: number | null
  l90d_occupancy?: number | null
  ttm_revpar?: number | null
  l90d_revpar?: number | null

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
  market_avg_revpar?: number | null
  market_avg_adr?: number | null

  // Location
  city?: string | null
  state?: string | null
}

export interface MarketData {
  average_daily_rate?: number | null
  occupancy?: number | null
  revenue?: number | null
  rev_par?: number | null
  active_listings_count?: number | null
}

// ─── Output Types ────────────────────────────────────────────────────────────

export type LeadPriority = 'hot' | 'warm' | 'cold' | 'excluded'
export type HostType = 'independent' | 'scaling' | 'professional'
export type AiBucket =
  | 'strong_lead'
  | 'pricing_opportunity'
  | 'optimization_opportunity'
  | 'multi_listing_host'
  | 'weak_lead'
export type LeadTier = 'strong' | 'moderate' | 'weak' | 'excluded'

export interface ScoringResult {
  // Primary output
  opportunity_score: number
  lead_priority_rank: LeadPriority
  recommended_outreach_reason: string

  // Component scores (all 0-100)
  occupancy_gap_score: number
  revpan_gap_score: number
  pricing_inefficiency_score: number
  listing_quality_gap_score: number
  momentum_score: number
  host_profile_score: number

  // Computed deltas (raw values for display)
  occupancy_delta: number | null
  revpan_delta: number | null
  adr_delta: number | null
  momentum_signal: number | null

  // Revenue upside estimate
  estimated_revenue_upside: number | null
  estimated_upside_pct: number | null

  // Host/listing classification
  host_type: HostType
  cohost_presence: boolean
  professional_management: boolean

  // Backward compat aliases
  revenue_potential_score: number
  pricing_opportunity_score: number
  listing_quality_score: number
  review_momentum_score: number
  competition_pressure_score: number
  ai_bucket: AiBucket
  lead_tier: LeadTier
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

// ─── 1. Review Confidence Modifier ──────────────────────────────────────────

function reviewConfidence(reviewCount: number): number {
  if (reviewCount < 10) return 0.3
  if (reviewCount < 30) return 0.6
  if (reviewCount < 80) return 1.0
  if (reviewCount < 150) return 0.9
  return 0.85
}

// ─── 2. Dynamic Weight Context ──────────────────────────────────────────────

interface WeightContext {
  listing_quality: number
  revenue_occupancy: number
  momentum: number
  host_profile: number
  pricing: number
}

function getDynamicWeights(listing: ListingData): WeightContext {
  const reviews = listing.total_reviews ?? 0
  const rating = listing.avg_rating ?? null
  const effectiveRating = rating ? rating * reviewConfidence(reviews) : null
  const momentum = calcRawMomentum(listing)

  const w = {
    listing_quality: 0.15,
    revenue_occupancy: 0.30,
    momentum: 0.15,
    host_profile: 0.15,
    pricing: 0.25,
  }

  if (reviews < 30) {
    w.listing_quality += 0.10
    w.revenue_occupancy -= 0.10
  } else if (reviews > 80 && effectiveRating !== null && effectiveRating > 4.0) {
    w.revenue_occupancy += 0.10
    w.listing_quality -= 0.05
    w.host_profile -= 0.05
  }

  if (momentum !== null && momentum < -0.15) {
    w.momentum += 0.10
    w.listing_quality -= 0.05
    w.revenue_occupancy -= 0.05
  }

  const total = Object.values(w).reduce((a, b) => a + b, 0)
  return {
    listing_quality: w.listing_quality / total,
    revenue_occupancy: w.revenue_occupancy / total,
    momentum: w.momentum / total,
    host_profile: w.host_profile / total,
    pricing: w.pricing / total,
  }
}

// ─── 3. Occupancy Gap Score ─────────────────────────────────────────────────

function calcOccupancyGapScore(listing: ListingData): { score: number; delta: number | null } {
  const listingOcc = listing.ttm_occupancy ?? listing.occupancy_rate ?? null
  const marketOcc = listing.market_avg_occupancy ?? null

  if (listingOcc === null || marketOcc === null) {
    return { score: 30, delta: null }
  }

  const lOcc = listingOcc > 1 ? listingOcc / 100 : listingOcc
  const mOcc = marketOcc > 1 ? marketOcc / 100 : marketOcc
  const delta = lOcc - mOcc

  if (delta < -0.20) return { score: 90, delta }
  if (delta < -0.10) return { score: 70, delta }
  if (delta < -0.05) return { score: 50, delta }
  if (delta < 0.05) return { score: 30, delta }
  return { score: 20, delta }
}

// ─── 4. RevPAN Gap Score ────────────────────────────────────────────────────

function calcRevPANGapScore(listing: ListingData): { score: number; delta: number | null } {
  const listingRevpar = listing.ttm_revpar ?? null
  const marketRevpar = listing.market_avg_revpar ?? null

  if (listingRevpar === null || marketRevpar === null || marketRevpar <= 0) {
    const listingRev = listing.ttm_revenue ?? listing.annual_revenue ?? null
    const marketRev = listing.market_avg_revenue ?? null
    if (listingRev === null || marketRev === null || marketRev <= 0) {
      return { score: 30, delta: null }
    }
    const delta = listingRev - marketRev
    const gapPct = (marketRev - listingRev) / marketRev
    if (gapPct > 0.30) return { score: 85, delta }
    if (gapPct > 0.20) return { score: 65, delta }
    if (gapPct > 0.10) return { score: 45, delta }
    if (gapPct > 0) return { score: 30, delta }
    return { score: 15, delta }
  }

  const delta = listingRevpar - marketRevpar
  const gapPct = (marketRevpar - listingRevpar) / marketRevpar

  if (gapPct > 0.30) return { score: 90, delta }
  if (gapPct > 0.20) return { score: 70, delta }
  if (gapPct > 0.10) return { score: 50, delta }
  if (gapPct > 0) return { score: 30, delta }
  return { score: 10, delta }
}

// ─── 5. Pricing Inefficiency Score ──────────────────────────────────────────

function calcPricingInefficiencyScore(listing: ListingData): { score: number; adrDelta: number | null } {
  const listingOcc = listing.ttm_occupancy ?? listing.occupancy_rate ?? null
  const marketOcc = listing.market_avg_occupancy ?? null
  const listingAdr = listing.ttm_avg_rate ?? listing.nightly_rate ?? null
  const marketAdr = listing.market_avg_adr ?? listing.market_avg_price ?? null

  const lOcc = listingOcc !== null ? (listingOcc > 1 ? listingOcc / 100 : listingOcc) : null
  const mOcc = marketOcc !== null ? (marketOcc > 1 ? marketOcc / 100 : marketOcc) : null
  const adrDelta = (listingAdr !== null && marketAdr !== null) ? listingAdr - marketAdr : null

  if (lOcc === null || mOcc === null) return { score: 25, adrDelta }

  const occDelta = lOcc - mOcc

  // Underpricing: high occupancy but revenue near/below market
  if (occDelta > 0.05) {
    const listingRevpar = listing.ttm_revpar ?? null
    const marketRevpar = listing.market_avg_revpar ?? null
    if (listingRevpar !== null && marketRevpar !== null) {
      const revparGap = (marketRevpar - listingRevpar) / marketRevpar
      if (revparGap > 0.10) return { score: 90, adrDelta }
      if (revparGap > 0) return { score: 60, adrDelta }
    }
    return { score: 50, adrDelta }
  }

  // Overpricing: low occupancy, ADR above market
  if (occDelta < -0.10 && adrDelta !== null && adrDelta > 0) {
    return { score: 80, adrDelta }
  }

  // Low occupancy with no clear pricing signal
  if (occDelta < -0.10) return { score: 55, adrDelta }
  if (occDelta < -0.05) return { score: 35, adrDelta }

  return { score: 20, adrDelta }
}

// ─── 6. Listing Quality Gap Score ───────────────────────────────────────────

function calcListingQualityGapScore(listing: ListingData): number {
  let gap = 0

  // Photo count (0-25 pts max)
  const photos = listing.photo_count ?? null
  if (photos !== null) {
    if (photos < 5) gap += 25
    else if (photos < 10) gap += 18
    else if (photos < 20) gap += 10
    else if (photos < 50) gap += 3
  } else {
    gap += 12
  }

  // Amenities (0-35 pts — more important than photos)
  const amenCount = listing.amenities_count ?? (listing.amenities?.length ?? null)
  if (amenCount !== null) {
    if (amenCount < 5) gap += 35
    else if (amenCount < 10) gap += 20
    else if (amenCount < 15) gap += 10
    else if (amenCount < 20) gap += 4
  } else {
    gap += 15
  }

  // Sub-ratings (0-40 pts)
  const subRatings = [
    listing.rating_cleanliness,
    listing.rating_accuracy,
    listing.rating_communication,
    listing.rating_checkin,
    listing.rating_value,
  ].filter((r): r is number => r !== null && r !== undefined)

  if (subRatings.length > 0) {
    const avgSubRating = subRatings.reduce((a, b) => a + b, 0) / subRatings.length
    if (avgSubRating < 4.0) gap += 40
    else if (avgSubRating < 4.3) gap += 28
    else if (avgSubRating < 4.6) gap += 15
    else if (avgSubRating < 4.8) gap += 6
  } else {
    gap += 18
  }

  return Math.min(100, gap)
}

// ─── 7. Momentum Score ──────────────────────────────────────────────────────

function calcRawMomentum(listing: ListingData): number | null {
  const l90dRev = listing.l90d_revenue ?? null
  const ttmRev = listing.ttm_revenue ?? listing.annual_revenue ?? null

  if (l90dRev === null || ttmRev === null || ttmRev <= 0) return null

  const l90dAnnualized = l90dRev * 4
  return (l90dAnnualized - ttmRev) / ttmRev
}

function calcMomentumScore(listing: ListingData): { score: number; signal: number | null } {
  const momentum = calcRawMomentum(listing)

  if (momentum === null) return { score: 40, signal: null }

  // Declining = high opportunity
  if (momentum < -0.30) return { score: 90, signal: momentum }
  if (momentum < -0.15) return { score: 75, signal: momentum }
  if (momentum < -0.05) return { score: 55, signal: momentum }

  // Stable
  if (momentum <= 0.05) return { score: 35, signal: momentum }

  // Growing = lower opportunity
  if (momentum <= 0.15) return { score: 20, signal: momentum }
  return { score: 10, signal: momentum }
}

// ─── 8. Host Profile Score ──────────────────────────────────────────────────

function calcHostProfileScore(listing: ListingData): number {
  const count = listing.host_listing_count ?? null
  const professionalMgmt = listing.professional_management ?? false
  const cohostPresence = listing.cohost_presence ?? professionalMgmt

  let score = 0

  if (count === null) {
    score = 60
  } else if (count >= 2 && count <= 5) {
    score = 100
  } else if (count === 1) {
    score = 65
  } else if (count <= 20) {
    score = 30
  } else {
    score = 0
  }

  if (cohostPresence) score = Math.round(score * 0.75)

  return Math.min(100, score)
}

// ─── 9. Revenue Upside Estimate ─────────────────────────────────────────────

function calcRevenueUpside(listing: ListingData): { upside: number | null; upsidePct: number | null } {
  const currentRevpar = listing.ttm_revpar ?? null
  const marketRevpar = listing.market_avg_revpar ?? null
  const ttmRevenue = listing.ttm_revenue ?? listing.annual_revenue ?? null

  if (currentRevpar === null || marketRevpar === null || ttmRevenue === null || ttmRevenue <= 0) {
    return { upside: null, upsidePct: null }
  }

  if (currentRevpar >= marketRevpar) {
    const listingOcc = listing.ttm_occupancy ?? listing.occupancy_rate ?? null
    const marketOcc = listing.market_avg_occupancy ?? null
    if (listingOcc !== null && marketOcc !== null) {
      const lOcc = listingOcc > 1 ? listingOcc / 100 : listingOcc
      const mOcc = marketOcc > 1 ? marketOcc / 100 : marketOcc
      if (lOcc > mOcc + 0.10) {
        const estimatedUpside = ttmRevenue * 0.15
        return { upside: Math.round(estimatedUpside), upsidePct: 0.15 }
      }
    }
    return { upside: null, upsidePct: null }
  }

  const revparGapPct = (marketRevpar - currentRevpar) / marketRevpar
  const capturableUpsidePct = Math.min(revparGapPct * 0.6, 0.5)
  const upside = Math.round(ttmRevenue * capturableUpsidePct)

  return {
    upside: upside > 0 ? upside : null,
    upsidePct: capturableUpsidePct > 0 ? capturableUpsidePct : null,
  }
}

// ─── 10. AI Bucket Assignment (backward compat) ─────────────────────────────

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

function assignBucket(
  listing: ListingData,
  pricingScore: number,
  qualityScore: number,
  revenueOccupancyScore: number,
  hostType: HostType,
  opportunityScore: number
): AiBucket {
  if (
    hostType === 'professional' ||
    (listing.total_reviews ?? 0) < 3 ||
    (listing.avg_rating != null && listing.avg_rating < 3.5)
  ) {
    return 'weak_lead'
  }

  if (matchesIdealProfile(listing) && opportunityScore >= 65) {
    return 'strong_lead'
  }

  if (pricingScore >= 70 && revenueOccupancyScore >= 60) {
    return 'pricing_opportunity'
  }

  if (hostType === 'scaling') {
    return 'multi_listing_host'
  }

  if (qualityScore >= 40) {
    return 'optimization_opportunity'
  }

  if (opportunityScore >= 40) {
    return 'pricing_opportunity'
  }

  return 'weak_lead'
}

// ─── 11. Outreach Reason Builder ────────────────────────────────────────────

function buildOutreachReason(
  listing: ListingData,
  occDelta: number | null,
  revpanDelta: number | null,
  adrDelta: number | null,
  momSignal: number | null,
  upsidePct: number | null
): string {
  const reasons: string[] = []

  if (momSignal !== null && momSignal < -0.15) {
    const pct = Math.round(Math.abs(momSignal) * 100)
    reasons.push(`Revenue down ${pct}% vs last year`)
  }

  if (occDelta !== null && occDelta > 0.05 && revpanDelta !== null && revpanDelta < 0) {
    reasons.push('High occupancy but below-market revenue — likely underpriced')
  }

  if (occDelta !== null && occDelta < -0.10 && adrDelta !== null && adrDelta > 0) {
    reasons.push('Priced above market but booking below market pace')
  }

  if (occDelta !== null && occDelta < -0.10 && reasons.length === 0) {
    const pct = Math.round(Math.abs(occDelta) * 100)
    reasons.push(`Occupancy ${pct}% below comparable listings`)
  }

  if (revpanDelta !== null && revpanDelta < -500 && reasons.length < 2) {
    reasons.push(`RevPAR $${Math.round(Math.abs(revpanDelta))} below market average`)
  }

  if (upsidePct !== null && upsidePct >= 0.20) {
    const pct = Math.round(upsidePct * 100)
    reasons.push(`Estimated ${pct}% revenue upside available`)
  }

  if (reasons.length === 0) {
    reasons.push('Listing quality gaps suggest untapped optimization potential')
  }

  return reasons.join('; ')
}

// ─── Main Scoring Function ──────────────────────────────────────────────────

export function scoreListing(listing: ListingData): ScoringResult {
  const reviews = listing.total_reviews ?? 0
  const confidence = reviewConfidence(reviews)
  const weights = getDynamicWeights(listing)

  // Component calculations
  const { score: occScore, delta: occDelta } = calcOccupancyGapScore(listing)
  const { score: revpanScore, delta: revpanDelta } = calcRevPANGapScore(listing)
  const { score: pricingScore, adrDelta } = calcPricingInefficiencyScore(listing)
  const qualityScore = calcListingQualityGapScore(listing)
  const { score: momScore, signal: momSignal } = calcMomentumScore(listing)
  const hostScore = calcHostProfileScore(listing)

  // Revenue/occupancy combined sub-score
  const revenueOccupancyScore = occScore * 0.45 + revpanScore * 0.55

  // Apply confidence modifier to revenue signals
  const confidenceAdjustedRevOcc =
    revenueOccupancyScore * confidence + revenueOccupancyScore * (1 - confidence) * 0.5

  // Composite opportunity score using dynamic weights
  const opportunityScore = clamp(
    Math.round(
      confidenceAdjustedRevOcc * weights.revenue_occupancy +
        pricingScore * weights.pricing +
        qualityScore * weights.listing_quality +
        momScore * weights.momentum +
        hostScore * weights.host_profile
    )
  )

  // Revenue upside
  const { upside, upsidePct } = calcRevenueUpside(listing)

  // Host classification
  const count = listing.host_listing_count ?? null
  let hostType: HostType
  if (count === null || count <= 5) hostType = 'independent'
  else if (count <= 20) hostType = 'scaling'
  else hostType = 'professional'

  const professionalMgmt = listing.professional_management ?? false
  const cohostPresence = listing.cohost_presence ?? professionalMgmt

  // Exclusion check
  const isExcluded =
    hostType === 'professional' ||
    (listing.avg_rating !== null &&
      listing.avg_rating !== undefined &&
      listing.avg_rating < 3.5 &&
      reviews > 20)

  // Lead priority
  let leadPriority: LeadPriority
  if (isExcluded) {
    leadPriority = 'excluded'
  } else if (
    opportunityScore >= 70 &&
    (upsidePct === null || upsidePct >= 0.20) &&
    !cohostPresence
  ) {
    leadPriority = 'hot'
  } else if (opportunityScore >= 50) {
    leadPriority = 'warm'
  } else {
    leadPriority = 'cold'
  }

  // Outreach reason
  const outreachReason = buildOutreachReason(
    listing,
    occDelta,
    revpanDelta,
    adrDelta,
    momSignal,
    upsidePct
  )

  // AI bucket (backward compat)
  const aiBucket = assignBucket(
    listing,
    pricingScore,
    qualityScore,
    revenueOccupancyScore,
    hostType,
    opportunityScore
  )

  // Lead tier (backward compat)
  const leadTier: LeadTier = isExcluded
    ? 'excluded'
    : opportunityScore >= 70
      ? 'strong'
      : opportunityScore >= 45
        ? 'moderate'
        : 'weak'

  return {
    opportunity_score: opportunityScore,
    lead_priority_rank: leadPriority,
    recommended_outreach_reason: outreachReason,

    occupancy_gap_score: Math.round(occScore),
    revpan_gap_score: Math.round(revpanScore),
    pricing_inefficiency_score: Math.round(pricingScore),
    listing_quality_gap_score: Math.round(qualityScore),
    momentum_score: Math.round(momScore),
    host_profile_score: Math.round(hostScore),

    occupancy_delta: occDelta !== null ? Math.round(occDelta * 1000) / 1000 : null,
    revpan_delta: revpanDelta,
    adr_delta: adrDelta,
    momentum_signal: momSignal !== null ? Math.round(momSignal * 1000) / 1000 : null,

    estimated_revenue_upside: upside,
    estimated_upside_pct: upsidePct !== null ? Math.round(upsidePct * 1000) / 1000 : null,

    host_type: hostType,
    cohost_presence: cohostPresence,
    professional_management: professionalMgmt,

    // Backward compat aliases
    revenue_potential_score: opportunityScore,
    pricing_opportunity_score: Math.round(pricingScore),
    listing_quality_score: Math.round(100 - qualityScore),
    review_momentum_score: Math.round(momScore),
    competition_pressure_score: Math.round(revenueOccupancyScore),
    ai_bucket: aiBucket,
    lead_tier: leadTier,
  }
}

export function scoreListings(listings: ListingData[]): ScoringResult[] {
  return listings.map(scoreListing)
}
