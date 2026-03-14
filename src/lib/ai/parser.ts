/**
 * AI Response Parser for ListingScout
 * 
 * Parses and validates AI responses using Zod schemas.
 */

import { z } from 'zod'

// Schema for a single listing from AI research
export const AIListingSchema = z.object({
  listing_id: z.string().min(1),
  listing_url: z.string().url(),
  listing_title: z.string().min(1),
  property_type: z.string().default('entire_home'),
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  neighborhood: z.string().nullable().optional(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().min(0),
  max_guests: z.number().int().min(1),
  nightly_rate: z.number().positive().nullable().optional(),
  avg_rating: z.number().min(0).max(5).nullable().optional(),
  total_reviews: z.number().int().min(0).default(0),
  host_name: z.string().nullable().optional(),
  superhost: z.boolean().default(false),
  amenities: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
})

export type AIListing = z.infer<typeof AIListingSchema>

// Schema for AI listings response
export const AIListingsResponseSchema = z.array(AIListingSchema)

// Schema for owner research response
export const AIOwnerSchema = z.object({
  owner_name: z.string().nullable(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  linkedin_url: z.string().url().nullable().optional(),
  company_name: z.string().nullable().optional(),
  verification_level: z.enum(['verified', 'probable', 'unverified']).default('unverified'),
  verification_sources: z.array(z.string()).default([]),
  confidence_notes: z.string().optional(),
})

export type AIOwner = z.infer<typeof AIOwnerSchema>

/**
 * Parse and validate AI listings response
 */
export function parseListingsResponse(response: string): {
  success: boolean
  data?: AIListing[]
  error?: string
} {
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = response.trim()
    
    // Remove markdown code block if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }
    
    // Try to find JSON array
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) {
      jsonStr = arrayMatch[0]
    }
    
    const parsed = JSON.parse(jsonStr)
    const validated = AIListingsResponseSchema.parse(parsed)
    
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError 
        ? `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        : error instanceof Error 
          ? error.message 
          : 'Unknown parsing error',
    }
  }
}

/**
 * Parse and validate AI owner research response
 */
export function parseOwnerResponse(response: string): {
  success: boolean
  data?: AIOwner
  error?: string
} {
  try {
    let jsonStr = response.trim()
    
    // Remove markdown code block if present
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim()
    }
    
    // Try to find JSON object
    const objectMatch = jsonStr.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      jsonStr = objectMatch[0]
    }
    
    const parsed = JSON.parse(jsonStr)
    const validated = AIOwnerSchema.parse(parsed)
    
    return {
      success: true,
      data: validated,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof z.ZodError 
        ? `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        : error instanceof Error 
          ? error.message 
          : 'Unknown parsing error',
    }
  }
}

/**
 * Sanitize and clean listing data from AI
 */
export function sanitizeListing(listing: AIListing): AIListing {
  return {
    ...listing,
    // Ensure listing_id is clean
    listing_id: listing.listing_id.replace(/[^a-zA-Z0-9-_]/g, ''),
    // Ensure URL is complete
    listing_url: listing.listing_url.startsWith('http') 
      ? listing.listing_url 
      : `https://www.airbnb.com/rooms/${listing.listing_id}`,
    // Clean up strings
    listing_title: listing.listing_title.trim(),
    city: listing.city.trim(),
    state: listing.state.toUpperCase().trim(),
    neighborhood: listing.neighborhood?.trim() || null,
    host_name: listing.host_name?.trim() || null,
    // Ensure numbers are valid
    bedrooms: Math.max(0, Math.floor(listing.bedrooms)),
    bathrooms: Math.max(0, listing.bathrooms),
    max_guests: Math.max(1, Math.floor(listing.max_guests)),
    total_reviews: Math.max(0, Math.floor(listing.total_reviews)),
    // Cap rating at 5
    avg_rating: listing.avg_rating ? Math.min(5, Math.max(0, listing.avg_rating)) : null,
    // Ensure positive rate
    nightly_rate: listing.nightly_rate && listing.nightly_rate > 0 
      ? listing.nightly_rate 
      : null,
  }
}
