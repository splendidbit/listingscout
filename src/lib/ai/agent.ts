/**
 * AI Research Agent for ListingScout
 * 
 * Orchestrates AI-powered research for listings and owners.
 */

import { CampaignCriteria } from '@/lib/types/criteria'
import { getResearchSystemPrompt, getOwnerResearchPrompt } from './prompts'
import { parseListingsResponse, parseOwnerResponse, sanitizeListing, AIListing, AIOwner } from './parser'

export interface ResearchResult {
  success: boolean
  listings?: AIListing[]
  error?: string
  tokensUsed?: number
}

export interface OwnerResearchResult {
  success: boolean
  owner?: AIOwner
  error?: string
}

/**
 * Research listings using AI
 * 
 * Note: This is a mock implementation. In production, you would:
 * 1. Call OpenAI/Anthropic API with the system prompt
 * 2. Parse and validate the response
 * 3. Return the listings for user review
 */
export async function researchListings(
  criteria: CampaignCriteria,
  apiKey?: string
): Promise<ResearchResult> {
  // Check for API key
  if (!apiKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: 'No AI API key configured. Please set OPENAI_API_KEY or ANTHROPIC_API_KEY.',
    }
  }

  const systemPrompt = getResearchSystemPrompt(criteria)

  try {
    // In production, this would call the actual AI API
    // For now, we'll return a mock response structure
    const mockResponse = getMockListings(criteria)
    
    const parseResult = parseListingsResponse(JSON.stringify(mockResponse))
    
    if (!parseResult.success) {
      return {
        success: false,
        error: parseResult.error,
      }
    }

    // Sanitize each listing
    const sanitizedListings = parseResult.data!.map(sanitizeListing)

    return {
      success: true,
      listings: sanitizedListings,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI research failed',
    }
  }
}

/**
 * Research owner information using AI
 */
export async function researchOwner(
  listingData: {
    listing_title: string
    city: string
    state: string
    host_name: string | null
    full_address: string | null
  },
  apiKey?: string
): Promise<OwnerResearchResult> {
  if (!apiKey && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    return {
      success: false,
      error: 'No AI API key configured',
    }
  }

  const prompt = getOwnerResearchPrompt(listingData)

  try {
    // In production, call actual AI API here
    // Mock response for now
    const mockOwner: AIOwner = {
      owner_name: listingData.host_name,
      email: null,
      phone: null,
      linkedin_url: null,
      company_name: null,
      verification_level: 'unverified',
      verification_sources: [],
      confidence_notes: 'Mock data - AI integration required',
    }

    return {
      success: true,
      owner: mockOwner,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Owner research failed',
    }
  }
}

/**
 * Call OpenAI API
 */
async function callOpenAI(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'OpenAI API error')
  }

  const data = await response.json()
  return data.choices[0].message.content
}

/**
 * Call Anthropic API
 */
async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Anthropic API error')
  }

  const data = await response.json()
  return data.content[0].text
}

/**
 * Generate mock listings for testing
 */
function getMockListings(criteria: CampaignCriteria): AIListing[] {
  const city = criteria.location.target_markets[0]?.split(',')[0] || 'Austin'
  const state = criteria.location.target_markets[0]?.split(',')[1]?.trim() || 'TX'
  
  const mockListings: AIListing[] = [
    {
      listing_id: 'mock-12345',
      listing_url: 'https://www.airbnb.com/rooms/12345',
      listing_title: `Modern ${criteria.property.min_bedrooms}BR Home in ${city}`,
      property_type: criteria.property.types[0] || 'entire_home',
      city,
      state: state.substring(0, 2).toUpperCase(),
      neighborhood: criteria.location.neighborhoods[0] || 'Downtown',
      bedrooms: criteria.property.min_bedrooms,
      bathrooms: criteria.property.min_bathrooms,
      max_guests: criteria.property.min_guests,
      nightly_rate: (criteria.performance.nightly_rate_min + criteria.performance.nightly_rate_max) / 2 || 150,
      avg_rating: 4.8,
      total_reviews: 45,
      host_name: 'John D.',
      superhost: true,
      amenities: ['wifi', 'pool', 'kitchen', 'parking'],
      notes: 'Mock listing for testing - AI integration required',
    },
    {
      listing_id: 'mock-67890',
      listing_url: 'https://www.airbnb.com/rooms/67890',
      listing_title: `Cozy Retreat in ${city} with Great Views`,
      property_type: criteria.property.types[0] || 'entire_home',
      city,
      state: state.substring(0, 2).toUpperCase(),
      neighborhood: null,
      bedrooms: criteria.property.min_bedrooms + 1,
      bathrooms: criteria.property.min_bathrooms + 0.5,
      max_guests: criteria.property.min_guests + 2,
      nightly_rate: criteria.performance.nightly_rate_max || 200,
      avg_rating: 4.6,
      total_reviews: 28,
      host_name: 'Sarah M.',
      superhost: false,
      amenities: ['wifi', 'hot_tub', 'kitchen', 'workspace'],
      notes: 'Mock listing for testing - AI integration required',
    },
  ]

  return mockListings
}
