'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScoreBadge } from '@/components/scoring/score-badge'
import { ScoreBreakdown } from '@/components/scoring/score-breakdown'
import { 
  ExternalLink, 
  MapPin, 
  Bed, 
  Bath, 
  Users, 
  Star,
  DollarSign,
  User,
  Calendar,
  MessageSquare,
  Copy,
  CheckCircle
} from 'lucide-react'
import { useState } from 'react'

interface ListingDetail {
  id: string
  listing_id: string
  listing_url: string
  listing_title: string
  property_type: string
  city: string
  state: string
  neighborhood: string | null
  full_address: string | null
  bedrooms: number
  bathrooms: number
  max_guests: number
  nightly_rate: number | null
  cleaning_fee: number | null
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
  score_breakdown: {
    location: number
    property: number
    performance: number
    host: number
    contact: number
    deal: number
  } | null
  flags: string[] | null
  notes: string | null
  collection_source: string
  created_at: string
}

interface ListingDetailCardProps {
  listing: ListingDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ListingDetailCard({ listing, open, onOpenChange }: ListingDetailCardProps) {
  const [copied, setCopied] = useState(false)

  if (!listing) return null

  const copyUrl = async () => {
    await navigator.clipboard.writeText(listing.listing_url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] bg-[#0A0A0F] border-[#2A2A3C] overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg text-[#F0F0F5] line-clamp-2">
                {listing.listing_title}
              </SheetTitle>
              <div className="flex items-center gap-2 mt-1 text-sm text-[#9494A8]">
                <MapPin className="h-3 w-3 shrink-0" />
                <span>{listing.city}, {listing.state}</span>
                {listing.neighborhood && (
                  <>
                    <span>•</span>
                    <span>{listing.neighborhood}</span>
                  </>
                )}
              </div>
            </div>
            <ScoreBadge 
              score={listing.lead_score} 
              tier={listing.lead_tier}
              size="lg"
              showTier
            />
          </div>
        </SheetHeader>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              asChild
            >
              <a href={listing.listing_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Listing
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={copyUrl}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-[#22C55E]" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Score Breakdown */}
          {listing.score_breakdown && (
            <div className="bg-[#1A1A26] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F0F0F5] mb-3">Score Breakdown</h4>
              <ScoreBreakdown breakdown={listing.score_breakdown} />
            </div>
          )}

          {/* Property Details */}
          <div className="bg-[#1A1A26] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#F0F0F5] mb-3">Property Details</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Bed className="h-4 w-4 text-[#9494A8]" />
                <span className="text-[#F0F0F5]">{listing.bedrooms} beds</span>
              </div>
              <div className="flex items-center gap-2">
                <Bath className="h-4 w-4 text-[#9494A8]" />
                <span className="text-[#F0F0F5]">{listing.bathrooms} baths</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#9494A8]" />
                <span className="text-[#F0F0F5]">{listing.max_guests} guests</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#2A2A3C]">
              <Badge variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1]">
                {listing.property_type}
              </Badge>
              {listing.instant_book && (
                <Badge variant="secondary" className="ml-2 bg-[#22C55E]/10 text-[#22C55E]">
                  Instant Book
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing & Performance */}
          <div className="bg-[#1A1A26] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#F0F0F5] mb-3">Pricing & Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 text-[#9494A8] text-sm mb-1">
                  <DollarSign className="h-3 w-3" />
                  Nightly Rate
                </div>
                <p className="text-lg font-mono text-[#F0F0F5]">
                  {listing.nightly_rate ? `$${listing.nightly_rate}` : '—'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#9494A8] text-sm mb-1">
                  <DollarSign className="h-3 w-3" />
                  Cleaning Fee
                </div>
                <p className="text-lg font-mono text-[#F0F0F5]">
                  {listing.cleaning_fee ? `$${listing.cleaning_fee}` : '—'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#9494A8] text-sm mb-1">
                  <Star className="h-3 w-3" />
                  Rating
                </div>
                <p className="text-lg font-mono text-[#F0F0F5]">
                  {listing.avg_rating?.toFixed(1) || '—'}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 text-[#9494A8] text-sm mb-1">
                  <MessageSquare className="h-3 w-3" />
                  Reviews
                </div>
                <p className="text-lg font-mono text-[#F0F0F5]">
                  {listing.total_reviews}
                </p>
              </div>
            </div>
          </div>

          {/* Host Info */}
          <div className="bg-[#1A1A26] rounded-lg p-4">
            <h4 className="text-sm font-medium text-[#F0F0F5] mb-3">Host Information</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-[#9494A8]" />
                  <span className="text-[#F0F0F5]">{listing.host_name || 'Unknown'}</span>
                </div>
                {listing.superhost && (
                  <Badge variant="secondary" className="bg-[#F59E0B]/10 text-[#F59E0B]">
                    Superhost
                  </Badge>
                )}
              </div>
              {listing.host_since && (
                <div className="flex items-center gap-2 text-sm text-[#9494A8]">
                  <Calendar className="h-3 w-3" />
                  Host since {new Date(listing.host_since).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-[#9494A8]">Listings</p>
                  <p className="font-mono text-[#F0F0F5]">{listing.host_listing_count || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-[#9494A8]">Response Rate</p>
                  <p className="font-mono text-[#F0F0F5]">
                    {listing.host_response_rate ? `${listing.host_response_rate}%` : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div className="bg-[#1A1A26] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F0F0F5] mb-3">Amenities</h4>
              <div className="flex flex-wrap gap-2">
                {listing.amenities.map((amenity) => (
                  <Badge 
                    key={amenity} 
                    variant="secondary" 
                    className="bg-[#2A2A3C] text-[#9494A8]"
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Flags */}
          {listing.flags && listing.flags.length > 0 && (
            <div className="bg-[#F59E0B]/10 rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F59E0B] mb-2">Flags</h4>
              <ul className="text-sm text-[#F0F0F5] space-y-1">
                {listing.flags.map((flag, i) => (
                  <li key={i}>• {flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Notes */}
          {listing.notes && (
            <div className="bg-[#1A1A26] rounded-lg p-4">
              <h4 className="text-sm font-medium text-[#F0F0F5] mb-2">Notes</h4>
              <p className="text-sm text-[#9494A8]">{listing.notes}</p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-[#5C5C72] space-y-1">
            <p>Source: {listing.collection_source}</p>
            <p>Added: {new Date(listing.created_at).toLocaleDateString()}</p>
            <p>ID: {listing.listing_id}</p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
