/**
 * AI Listing Analyzer
 * Uses GPT-4o-mini to generate qualitative lead analysis for STR listings.
 * Results are cached: re-analysis is skipped if ai_analyzed_at is < 7 days old.
 */

import { ListingData, MarketData } from '@/lib/scoring/engine'

export interface AIAnalysis {
  ai_lead_score: number        // 1-10
  opportunity_notes: string    // Primary opportunity identified
  outreach_angle: string       // Specific personalized outreach message
  confidence: number           // 0-1
  ai_analyzed_at: string       // ISO timestamp
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

/**
 * Check if a listing's AI analysis is still fresh (< 7 days old).
 */
export function isAnalysisFresh(aiAnalyzedAt: string | null | undefined): boolean {
  if (!aiAnalyzedAt) return false
  const analyzedDate = new Date(aiAnalyzedAt).getTime()
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return analyzedDate > sevenDaysAgo
}

/**
 * Build a concise listing summary for the AI prompt.
 * Only passes key fields — not the full raw_data blob.
 */
function buildListingSummary(listing: ListingData, marketData: MarketData): string {
  const rate = listing.nightly_rate ?? listing.ttm_avg_rate
  const occupancy = listing.occupancy_rate ?? listing.ttm_occupancy
  const revenue = listing.annual_revenue ?? listing.ttm_revenue
  const marketRate = listing.market_avg_price ?? marketData.average_daily_rate
  const marketOcc = listing.market_avg_occupancy ?? marketData.occupancy
  const marketRev = listing.market_avg_revenue ?? marketData.revenue

  const pricingGap = rate && marketRate && marketRate > rate
    ? Math.round(((marketRate - rate) / marketRate) * 100)
    : null

  const lines = [
    `Location: ${[listing.city, listing.state].filter(Boolean).join(', ')}`,
    `Property: ${listing.bedrooms ?? '?'}bd/${listing.bathrooms ?? '?'}ba, ${listing.room_type ?? 'unknown type'}`,
    `Host: ${listing.host_listing_count ?? 1} listing(s)`,
    `Nightly rate: $${rate ?? 'unknown'}/night`,
    marketRate ? `Market avg rate: $${Math.round(marketRate)}/night` : null,
    pricingGap !== null ? `Pricing gap: ${pricingGap}% below market` : null,
    occupancy ? `Occupancy: ${Math.round((occupancy > 1 ? occupancy : occupancy * 100))}%` : null,
    marketOcc ? `Market avg occupancy: ${Math.round((marketOcc > 1 ? marketOcc : marketOcc * 100))}%` : null,
    revenue ? `Annual revenue: $${Math.round(revenue).toLocaleString()}` : null,
    marketRev ? `Market avg revenue: $${Math.round(marketRev).toLocaleString()}/yr` : null,
    listing.avg_rating ? `Rating: ${listing.avg_rating.toFixed(1)} (${listing.total_reviews ?? 0} reviews)` : null,
    listing.photo_count !== null && listing.photo_count !== undefined ? `Photos: ${listing.photo_count}` : null,
    listing.amenities_count !== null && listing.amenities_count !== undefined ? `Amenities: ${listing.amenities_count}` : null,
    listing.description_length !== null && listing.description_length !== undefined ? `Description: ${listing.description_length} chars` : null,
    listing.rating_cleanliness ? `Cleanliness: ${listing.rating_cleanliness}` : null,
    listing.rating_communication ? `Communication: ${listing.rating_communication}` : null,
    listing.rating_value ? `Value: ${listing.rating_value}` : null,
    listing.superhost ? 'Superhost: Yes' : null,
    listing.instant_book ? 'Instant book: Yes' : null,
  ].filter(Boolean)

  return lines.join('\n')
}

/**
 * Analyze a listing with GPT-4o-mini to generate lead qualification insights.
 */
export async function analyzeListingWithAI(
  listing: ListingData,
  marketData: MarketData
): Promise<AIAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const summary = buildListingSummary(listing, marketData)

  const messages: OpenAIMessage[] = [
    {
      role: 'system',
      content: `You are a short-term rental (STR) revenue consulting analyst. 
Your job is to evaluate Airbnb listings and identify which hosts would most benefit from professional pricing, listing optimization, and revenue management consulting.

You must respond with valid JSON only — no explanation, no markdown.`,
    },
    {
      role: 'user',
      content: `Analyze this STR listing for consulting lead potential:

${summary}

Evaluate:
1. Does this host have genuine revenue upside (pricing, occupancy, or listing quality)?
2. What is the PRIMARY opportunity (pricing/photos/amenities/description/positioning)?
3. Is this host worth reaching out to for revenue management consulting?
4. Write a specific, personalized outreach angle (1-2 sentences, use actual numbers where available).

Respond with JSON:
{
  "ai_lead_score": <integer 1-10, where 10 = perfect consulting lead>,
  "opportunity_notes": "<1-2 sentence summary of the main revenue opportunity>",
  "outreach_angle": "<1-2 sentence personalized pitch using specific numbers>",
  "confidence": <float 0-1, how confident you are in this assessment>
}`,
    },
  ]

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.3, // Low temp for consistent scoring
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI API error ${response.status}: ${text}`)
  }

  const data = (await response.json()) as OpenAIResponse
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('Empty response from OpenAI')
  }

  let parsed: {
    ai_lead_score?: number
    opportunity_notes?: string
    outreach_angle?: string
    confidence?: number
  }

  try {
    parsed = JSON.parse(content)
  } catch {
    throw new Error(`Failed to parse OpenAI response: ${content}`)
  }

  return {
    ai_lead_score: Math.min(10, Math.max(1, Math.round(parsed.ai_lead_score ?? 5))),
    opportunity_notes: parsed.opportunity_notes ?? '',
    outreach_angle: parsed.outreach_angle ?? '',
    confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
    ai_analyzed_at: new Date().toISOString(),
  }
}
