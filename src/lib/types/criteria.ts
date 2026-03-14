// Criteria types for campaigns

export interface LocationCriteria {
  target_markets: string[]
  neighborhoods: string[]
  exclude_areas: string[]
  radius_miles: number
}

export interface PropertyCriteria {
  types: string[]
  min_bedrooms: number
  min_bathrooms: number
  min_guests: number
  required_amenities: string[]
  preferred_amenities: string[]
}

export interface PerformanceCriteria {
  min_reviews: number
  min_rating: number
  min_occupancy_pct: number
  nightly_rate_min: number
  nightly_rate_max: number
}

export interface HostCriteria {
  preferred_type: 'individual' | 'business' | 'any'
  superhost_required: boolean
  superhost_preferred: boolean
  min_listings: number
  max_listings: number
  min_years_hosting: number
}

export interface DealCriteria {
  objective: 'acquisition' | 'partnership' | 'research'
  budget_min: number
  budget_max: number
  preferred_contact: 'email' | 'phone' | 'any'
}

export interface ScoringWeights {
  location: number
  property: number
  performance: number
  host: number
  contact: number
  deal: number
}

export interface TierThresholds {
  strong_min: number
  weak_max: number
}

export interface CampaignCriteria {
  location: LocationCriteria
  property: PropertyCriteria
  performance: PerformanceCriteria
  host: HostCriteria
  deal: DealCriteria
  scoring_weights: ScoringWeights
  tier_thresholds: TierThresholds
}

export const DEFAULT_CRITERIA: CampaignCriteria = {
  location: {
    target_markets: [],
    neighborhoods: [],
    exclude_areas: [],
    radius_miles: 10,
  },
  property: {
    types: ['entire_home'],
    min_bedrooms: 1,
    min_bathrooms: 1,
    min_guests: 2,
    required_amenities: [],
    preferred_amenities: [],
  },
  performance: {
    min_reviews: 5,
    min_rating: 4.0,
    min_occupancy_pct: 0,
    nightly_rate_min: 0,
    nightly_rate_max: 1000,
  },
  host: {
    preferred_type: 'any',
    superhost_required: false,
    superhost_preferred: true,
    min_listings: 1,
    max_listings: 50,
    min_years_hosting: 0,
  },
  deal: {
    objective: 'research',
    budget_min: 0,
    budget_max: 0,
    preferred_contact: 'any',
  },
  scoring_weights: {
    location: 20,
    property: 15,
    performance: 20,
    host: 15,
    contact: 15,
    deal: 15,
  },
  tier_thresholds: {
    strong_min: 70,
    weak_max: 39,
  },
}

export const PROPERTY_TYPES = [
  { value: 'entire_home', label: 'Entire Home' },
  { value: 'condo', label: 'Condo' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'cabin', label: 'Cabin' },
  { value: 'villa', label: 'Villa' },
  { value: 'cottage', label: 'Cottage' },
  { value: 'loft', label: 'Loft' },
]

export const AMENITIES = [
  { value: 'wifi', label: 'WiFi' },
  { value: 'pool', label: 'Pool' },
  { value: 'hot_tub', label: 'Hot Tub' },
  { value: 'self_checkin', label: 'Self Check-in' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'washer', label: 'Washer' },
  { value: 'dryer', label: 'Dryer' },
  { value: 'parking', label: 'Free Parking' },
  { value: 'ac', label: 'Air Conditioning' },
  { value: 'heating', label: 'Heating' },
  { value: 'fireplace', label: 'Fireplace' },
  { value: 'gym', label: 'Gym' },
  { value: 'ev_charger', label: 'EV Charger' },
  { value: 'pet_friendly', label: 'Pet Friendly' },
]
