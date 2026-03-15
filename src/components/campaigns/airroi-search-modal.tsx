'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, ExternalLink, Star, DollarSign, TrendingUp, Users, BarChart2 } from 'lucide-react'
import { toast } from 'sonner'

// Matches the EnrichedListing shape from the search route
interface EnrichedListing {
  listing_id: string
  listing_url: string
  listing_title: string
  city: string
  state: string
  country: string | null
  neighborhood: string | null
  bedrooms: number
  bathrooms: number
  max_guests: number
  room_type: string
  avg_rating: number | null
  total_reviews: number
  nightly_rate: number | null
  ttm_avg_rate: number | null
  annual_revenue: number | null
  ttm_revenue: number | null
  ttm_occupancy: number | null
  occupancy_rate: number | null
  superhost: boolean
  host_listing_count: number | null
  host_type: string
  // Market
  market_avg_price: number | null
  market_avg_revenue: number | null
  market_avg_occupancy: number | null
  // Scores
  revenue_potential_score: number
  pricing_opportunity_score: number
  listing_quality_score: number
  lead_tier: string
  ai_bucket: string
  // AI
  ai_lead_score: number | null
  opportunity_notes: string | null
  outreach_angle: string | null
  cover_image_url: string | null
}

interface MarketSummary {
  average_daily_rate: number | null
  occupancy: number | null
  revenue: number | null
  active_listings_count: number | null
}

interface AirROISearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  onImported: () => void
}

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70 ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/30' :
    score >= 40 ? 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30' :
    'bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/30'

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${color}`}>
      {score}
    </span>
  )
}

// ─── Bucket Label ─────────────────────────────────────────────────────────────

function BucketLabel({ bucket }: { bucket: string }) {
  const config: Record<string, { emoji: string; label: string; color: string }> = {
    strong_lead:              { emoji: '⚡', label: 'Strong Lead',            color: 'text-[#22C55E]' },
    pricing_opportunity:      { emoji: '💰', label: 'Pricing Opportunity',    color: 'text-[#F59E0B]' },
    optimization_opportunity: { emoji: '📸', label: 'Optimization',           color: 'text-[#F97316]' },
    multi_listing_host:       { emoji: '🏠', label: 'Multi-Listing Host',     color: 'text-[#6366F1]' },
    weak_lead:                { emoji: '⬇️', label: 'Weak Lead',              color: 'text-[#9494A8]' },
  }

  const c = config[bucket] ?? { emoji: '❓', label: bucket, color: 'text-[#9494A8]' }
  return (
    <span className={`text-xs font-medium ${c.color}`}>
      {c.emoji} {c.label}
    </span>
  )
}

// ─── Host Type Badge ──────────────────────────────────────────────────────────

function HostTypeBadge({ listing }: { listing: EnrichedListing }) {
  const count = listing.host_listing_count
  if (count === null) return null

  const label = count === 1
    ? `DIY Host · 1 listing`
    : count <= 3
    ? `DIY Host · ${count} listings`
    : count <= 9
    ? `Scaling · ${count} listings`
    : `Professional · ${count}+ listings`

  const color = count <= 3
    ? 'bg-[#22C55E]/10 text-[#22C55E]'
    : count <= 9
    ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
    : 'bg-[#9494A8]/10 text-[#9494A8]'

  return (
    <Badge className={`${color} text-[10px] px-1.5 py-0 border-0 shrink-0`}>
      <Users className="h-2.5 w-2.5 mr-1 inline" />
      {label}
    </Badge>
  )
}

// ─── Pricing Gap ──────────────────────────────────────────────────────────────

function PricingGap({ listing }: { listing: EnrichedListing }) {
  const rate = listing.nightly_rate ?? listing.ttm_avg_rate
  const market = listing.market_avg_price

  if (!rate || !market || market <= rate) return null

  const gap = Math.round(market - rate)
  return (
    <span className="text-xs text-[#F59E0B]">
      ${gap} below market
    </span>
  )
}

// ─── Market Context ───────────────────────────────────────────────────────────

function MarketContext({ market }: { market: MarketSummary | null }) {
  if (!market || (!market.average_daily_rate && !market.revenue)) return null

  return (
    <div className="flex items-center gap-3 text-xs text-[#5C5C72] bg-[#12121A] rounded px-2 py-1.5 border border-[#2A2A3C]">
      <BarChart2 className="h-3 w-3 text-[#6366F1] shrink-0" />
      <span>Market avg:</span>
      {market.average_daily_rate && (
        <span className="text-[#9494A8]">${Math.round(market.average_daily_rate)}/night</span>
      )}
      {market.occupancy && (
        <span className="text-[#9494A8]">{Math.round(market.occupancy * 100)}% occ</span>
      )}
      {market.revenue && (
        <span className="text-[#9494A8]">${Math.round(market.revenue / 1000)}k/yr</span>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function AirROISearchModal({ open, onOpenChange, campaignId, onImported }: AirROISearchModalProps) {
  const [locality, setLocality] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('United States')
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [results, setResults] = useState<EnrichedListing[]>([])
  const [market, setMarket] = useState<MarketSummary | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!locality.trim() && !region.trim()) {
      toast.error('Enter at least a city or state to search')
      return
    }
    setIsSearching(true)
    setResults([])
    setSelected(new Set())
    setSearched(false)
    setMarket(null)

    try {
      const res = await fetch('/api/airroi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          country: country || 'United States',
          region: region || undefined,
          locality: locality || undefined,
          page_size: 10,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')

      const listings: EnrichedListing[] = data.listings || []
      setResults(listings)
      setMarket(data.market ?? null)
      setSearched(true)

      // Auto-select strong leads (score >= 65)
      const autoSelected = new Set(
        listings
          .filter(l => l.revenue_potential_score >= 65)
          .map(l => l.listing_id)
      )
      setSelected(autoSelected)

      if (listings.length === 0) {
        toast.info('No listings found. Try broadening your search.')
      } else if (autoSelected.size > 0) {
        toast.success(`Found ${listings.length} listings — ${autoSelected.size} strong leads auto-selected.`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => setSelected(new Set(results.map(l => l.listing_id)))
  const clearAll = () => setSelected(new Set())

  const handleImport = async () => {
    if (selected.size === 0) {
      toast.error('Select at least one listing to import')
      return
    }
    setIsImporting(true)
    try {
      const toImport = results.filter(l => selected.has(l.listing_id))
      const res = await fetch('/api/airroi/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, listings: toImport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Import failed')
      toast.success(data.message || `Imported ${data.inserted} listings`)
      onImported()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#12121A] border-[#2A2A3C]">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F5]">Search AirROI Listings</DialogTitle>
          <DialogDescription className="text-[#9494A8]">
            Search 20M+ STR listings. Results are scored for consulting lead potential — entire home listings only.
          </DialogDescription>
        </DialogHeader>

        {/* Search Form */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <div>
            <Label className="text-[#9494A8] text-xs mb-1 block">City</Label>
            <Input
              placeholder="e.g. Austin"
              value={locality}
              onChange={e => setLocality(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            />
          </div>
          <div>
            <Label className="text-[#9494A8] text-xs mb-1 block">State / Region</Label>
            <Input
              placeholder="e.g. Texas"
              value={region}
              onChange={e => setRegion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            />
          </div>
          <div>
            <Label className="text-[#9494A8] text-xs mb-1 block">Country</Label>
            <Input
              placeholder="e.g. United States"
              value={country}
              onChange={e => setCountry(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
            />
          </div>
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching}
          className="bg-[#6366F1] hover:bg-[#818CF8] w-full"
        >
          {isSearching ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching &amp; Scoring...</>
          ) : (
            <><Search className="h-4 w-4 mr-2" />Search Listings</>
          )}
        </Button>

        {/* Results */}
        {searched && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            {/* Market context bar */}
            <MarketContext market={market} />

            <div className="flex items-center justify-between py-2 mt-1">
              <span className="text-sm text-[#9494A8]">
                {results.length} listings
                {selected.size > 0 && <span className="ml-2 text-[#6366F1]">· {selected.size} selected</span>}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs text-[#9494A8]">Select All</Button>
                <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs text-[#9494A8]">Clear</Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={isImporting || selected.size === 0}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                >
                  {isImporting ? (
                    <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importing...</>
                  ) : (
                    <><Download className="h-4 w-4 mr-1" />Import {selected.size > 0 ? `(${selected.size})` : ''}</>
                  )}
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {results.map(listing => {
                const rate = listing.nightly_rate ?? listing.ttm_avg_rate
                const revenue = listing.ttm_revenue ?? listing.annual_revenue

                return (
                  <div
                    key={listing.listing_id}
                    onClick={() => toggleSelect(listing.listing_id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.has(listing.listing_id)
                        ? 'border-[#6366F1] bg-[#6366F1]/10'
                        : 'border-[#2A2A3C] bg-[#1A1A26] hover:border-[#3A3A52]'
                    }`}
                  >
                    {/* Row 1: Title + Score + Bucket */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-[#F0F0F5] truncate">{listing.listing_title}</p>
                          <ScoreBadge score={listing.revenue_potential_score} />
                          <BucketLabel bucket={listing.ai_bucket} />
                        </div>

                        {/* Row 2: Location + Property */}
                        <p className="text-xs text-[#9494A8] mt-0.5">
                          {[listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')}
                          {' · '}{listing.bedrooms}bd {listing.bathrooms}ba · {listing.max_guests} guests
                        </p>
                      </div>

                      {/* Right-side stats */}
                      <div className="flex items-center gap-3 shrink-0 text-xs">
                        {listing.avg_rating && (
                          <div className="flex items-center gap-1 text-[#F59E0B]">
                            <Star className="h-3 w-3" />
                            <span>{listing.avg_rating.toFixed(1)}</span>
                            <span className="text-[#5C5C72]">({listing.total_reviews})</span>
                          </div>
                        )}
                        {rate && (
                          <div className="flex items-center gap-1 text-[#9494A8]">
                            <DollarSign className="h-3 w-3" />
                            <span>${Math.round(rate)}/night</span>
                          </div>
                        )}
                        {revenue && (
                          <div className="flex items-center gap-1 text-[#22C55E]">
                            <TrendingUp className="h-3 w-3" />
                            <span>${Math.round(revenue / 1000)}k/yr</span>
                          </div>
                        )}
                        <a
                          href={listing.listing_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="text-[#6366F1] hover:text-[#818CF8]"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    {/* Row 3: Host type + Pricing gap + Market avg */}
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <HostTypeBadge listing={listing} />
                      <PricingGap listing={listing} />
                      {listing.market_avg_price && (
                        <span className="text-xs text-[#5C5C72]">
                          Market avg: ${Math.round(listing.market_avg_price)}/night
                          {listing.market_avg_revenue && `, $${Math.round(listing.market_avg_revenue / 1000)}k/yr`}
                        </span>
                      )}
                      {listing.superhost && (
                        <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] px-1 py-0 border-0">Superhost</Badge>
                      )}
                    </div>

                    {/* Row 4: Opportunity notes snippet */}
                    {listing.opportunity_notes && (
                      <p className="text-xs text-[#7C7C92] mt-1.5 italic line-clamp-2">
                        {listing.opportunity_notes}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
