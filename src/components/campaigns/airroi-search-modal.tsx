'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Search, Download, ExternalLink, Star, DollarSign, TrendingUp, MapPin, Link as LinkIcon, Hash, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { toast } from 'sonner'

interface Market {
  full_name: string
  country: string
  region?: string
  locality?: string
  district?: string
  active_listings_count?: number
}

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
  avg_rating: number | null
  total_reviews: number
  nightly_rate: number | null
  ttm_avg_rate: number | null
  annual_revenue: number | null
  ttm_revenue: number | null
  ttm_occupancy: number | null
  superhost: boolean
  host_name: string | null
  host_listing_count: number | null
  host_type: string
  photo_count: number | null
  amenities_count: number | null
  revenue_potential_score: number
  pricing_opportunity_score: number
  listing_quality_score: number
  review_momentum_score: number
  competition_pressure_score: number
  ai_lead_score: number | null
  ai_bucket: string
  opportunity_notes: string | null
  outreach_angle: string | null
  lead_tier: string
  market_avg_price: number | null
  market_avg_occupancy: number | null
  market_avg_revenue: number | null
}

interface AirROISearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  onImported: () => void
}

const bucketConfig: Record<string, { emoji: string; label: string; color: string }> = {
  strong_lead:             { emoji: '⚡', label: 'Strong Lead',          color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  pricing_opportunity:     { emoji: '💰', label: 'Pricing Opportunity',  color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  optimization_opportunity:{ emoji: '📸', label: 'Needs Optimization',   color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  multi_listing_host:      { emoji: '🔄', label: 'Scaling Host',         color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  weak_lead:               { emoji: '❌', label: 'Weak Lead',            color: 'bg-red-500/10 text-red-400 border-red-500/20' },
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 65 ? 'bg-green-500/10 text-green-400' : score >= 40 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
  return <span className={`text-xs font-mono px-2 py-0.5 rounded ${color}`}>{score}</span>
}

export function AirROISearchModal({ open, onOpenChange, campaignId, onImported }: AirROISearchModalProps) {
  const [query, setQuery] = useState('')
  const [markets, setMarkets] = useState<Market[]>([])
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null)
  const [isLoadingMarkets, setIsLoadingMarkets] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [results, setResults] = useState<EnrichedListing[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searched, setSearched] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Lookup tab state
  const [lookupInput, setLookupInput] = useState('')
  const [isLooking, setIsLooking] = useState(false)

  // Market typeahead
  useEffect(() => {
    if (query.length < 2) { setMarkets([]); setShowDropdown(false); return }
    if (selectedMarket && query === selectedMarket.full_name) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setIsLoadingMarkets(true)
      try {
        const res = await fetch(`/api/airroi/markets?query=${encodeURIComponent(query)}`)
        const data = await res.json()
        const list: Market[] = data.markets ?? []
        setMarkets(list)
        setShowDropdown(list.length > 0)
      } catch {
        setMarkets([])
      } finally {
        setIsLoadingMarkets(false)
      }
    }, 300)
  }, [query, selectedMarket])

  const selectMarket = (market: Market) => {
    setSelectedMarket(market)
    setQuery(market.full_name)
    setShowDropdown(false)
    setMarkets([])
  }

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error('Enter a market to search')
      return
    }
    setIsSearching(true)
    setResults([])
    setSelected(new Set())
    setSearched(false)

    // Use selected market fields if available, otherwise parse the query string
    const market = selectedMarket ?? { country: 'United States', locality: query.trim(), full_name: query.trim() }

    try {
      const res = await fetch('/api/airroi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          country: market.country,
          region: (market as Market).region,
          locality: (market as Market).locality,
          page_size: 10,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')

      const listings: EnrichedListing[] = data.listings ?? []
      setResults(listings)
      setSearched(true)

      // Auto-select strong leads
      const autoSelected = new Set(listings.filter(l => l.revenue_potential_score >= 65).map(l => l.listing_id))
      setSelected(autoSelected)

      if (listings.length === 0) toast.info('No listings found for this market.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  const toggleSelect = (id: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const handleImport = async () => {
    if (selected.size === 0) { toast.error('Select at least one listing'); return }
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
      toast.success(data.message)
      onImported()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  const handleLookup = async () => {
    const val = lookupInput.trim()
    if (!val) { toast.error('Enter an Airbnb URL, listing ID, or address'); return }
    setIsLooking(true)

    try {
      // Extract listing ID from URL or use as-is
      const idMatch = val.match(/airbnb\.com\/rooms\/(\d+)/) ?? val.match(/^(\d+)$/)
      
      let res, data
      if (idMatch) {
        // Lookup by listing ID
        res = await fetch(`/api/airroi/property?id=${idMatch[1]}`)
        data = await res.json()
        if (!res.ok) {
          if (res.status === 404) {
            toast.info('This listing isn\'t in AirROI\'s database yet. Try searching by address or market instead.')
          } else {
            throw new Error(data.error || 'Lookup failed')
          }
          setIsLooking(false)
          return
        }
        const listing = data.listing as EnrichedListing
        if (listing) {
          setResults([listing])
          setSelected(new Set([listing.listing_id]))
          setSearched(true)
        }
      } else {
        // Treat as address — use comparables endpoint via a new route
        res = await fetch('/api/airroi/search-address', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: val, campaignId }),
        })
        data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Address search failed')
        const listings = data.listings ?? []
        setResults(listings)
        setSelected(new Set(listings.filter((l: EnrichedListing) => l.revenue_potential_score >= 65).map((l: EnrichedListing) => l.listing_id)))
        setSearched(true)
        if (listings.length === 0) toast.info('No listings found for that address.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setIsLooking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#12121A] border-[#2A2A3C]">
        <DialogHeader>
          <DialogTitle className="text-[#F0F0F5]">Search AirROI Listings</DialogTitle>
          <DialogDescription className="text-[#9494A8]">
            Search 20M+ entire-home STR listings. Type a city, region, or country to get started.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="market" onValueChange={() => { setResults([]); setSearched(false) }}>
        <TabsList className="bg-[#1A1A26] border border-[#2A2A3C] w-full">
          <TabsTrigger value="market" className="flex-1 data-[state=active]:bg-[#6366F1]/20">
            <MapPin className="h-3.5 w-3.5 mr-1.5" />Market Search
          </TabsTrigger>
          <TabsTrigger value="lookup" className="flex-1 data-[state=active]:bg-[#6366F1]/20">
            <LinkIcon className="h-3.5 w-3.5 mr-1.5" />Listing / Address
          </TabsTrigger>
        </TabsList>

        <TabsContent value="market" className="mt-3 space-y-3">
        {/* Market Search */}
        <div className="relative" ref={dropdownRef}>
          <Label className="text-[#9494A8] text-xs mb-1 block">Market</Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5C72]" />
            <Input
              placeholder="Type a city, state, or country… e.g. Austin"
              value={query}
              onChange={e => { setQuery(e.target.value); setSelectedMarket(null) }}
              onKeyDown={e => e.key === 'Enter' && !showDropdown && selectedMarket && handleSearch()}
              className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5] pl-9"
            />
            {isLoadingMarkets && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-[#5C5C72]" />}
          </div>

          {showDropdown && (
            <div className="absolute z-50 w-full mt-1 bg-[#1A1A26] border border-[#2A2A3C] rounded-lg shadow-xl overflow-hidden">
              {markets.slice(0, 8).map((market, i) => (
                <button
                  key={i}
                  onClick={() => selectMarket(market)}
                  className="w-full text-left px-4 py-2.5 hover:bg-[#2A2A3C] transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="text-sm text-[#F0F0F5]">{market.full_name}</span>
                  </div>
                  {market.active_listings_count && (
                    <span className="text-xs text-[#5C5C72]">{market.active_listings_count.toLocaleString()} listings</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="bg-[#6366F1] hover:bg-[#818CF8] w-full"
        >
          {isSearching
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching & analyzing…</>
            : <><Search className="h-4 w-4 mr-2" />Search {query.trim() || 'Market'}</>
          }
        </Button>
        </TabsContent>

        <TabsContent value="lookup" className="mt-3 space-y-3">
          <div>
            <Label className="text-[#9494A8] text-xs mb-1 block">Airbnb URL, Listing ID, or Address</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5C72]" />
              <Input
                placeholder="https://airbnb.com/rooms/12345  or  123 Main St, Austin TX"
                value={lookupInput}
                onChange={e => setLookupInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleLookup()}
                className="bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5] pl-9"
              />
            </div>
            <p className="text-xs text-[#5C5C72] mt-1">
              Paste an Airbnb URL, numeric listing ID, or a street address to find comparable listings
            </p>
          </div>
          <Button
            onClick={handleLookup}
            disabled={isLooking || !lookupInput.trim()}
            className="bg-[#6366F1] hover:bg-[#818CF8] w-full"
          >
            {isLooking
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Looking up…</>
              : <><Search className="h-4 w-4 mr-2" />Look Up Listing</>
            }
          </Button>
        </TabsContent>
        </Tabs>

        {/* Results */}
        {searched && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#9494A8]">
                {results.length} listings · {selected.size} selected
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set(results.map(l => l.listing_id)))} className="text-xs text-[#9494A8]">All</Button>
                <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="text-xs text-[#9494A8]">None</Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={isImporting || selected.size === 0}
                  className="bg-[#22C55E] hover:bg-[#16A34A] text-white"
                >
                  {isImporting
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Importing…</>
                    : <><Download className="h-4 w-4 mr-1" />Import ({selected.size})</>
                  }
                </Button>
              </div>
            </div>

            {/* Market avg context */}
            {results[0]?.market_avg_price && (
              <div className="flex gap-4 text-xs text-[#9494A8] bg-[#1A1A26] rounded-lg px-3 py-2 mb-2">
                <span>Market avg: <span className="text-[#F0F0F5] font-mono">${Math.round(results[0].market_avg_price)}/night</span></span>
                {results[0].market_avg_revenue && <span>Market avg revenue: <span className="text-[#F0F0F5] font-mono">${Math.round(results[0].market_avg_revenue / 1000)}k/yr</span></span>}
              </div>
            )}

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {results.map(listing => {
                const bucket = bucketConfig[listing.ai_bucket] ?? bucketConfig.weak_lead
                const pricingGap = listing.market_avg_price && listing.ttm_avg_rate
                  ? Math.round(listing.market_avg_price - listing.ttm_avg_rate)
                  : null

                const isExpanded = expanded.has(listing.listing_id)
                return (
                  <div key={listing.listing_id} className={`rounded-lg border transition-colors ${selected.has(listing.listing_id) ? 'border-[#6366F1] bg-[#6366F1]/10' : 'border-[#2A2A3C] bg-[#1A1A26]'}`}>
                    {/* Main row */}
                    <div className="p-3 cursor-pointer hover:bg-white/[0.02]" onClick={() => toggleSelect(listing.listing_id)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-[#F0F0F5] truncate">{listing.listing_title}</p>
                            {listing.superhost && <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] px-1 py-0 shrink-0 border-0">Superhost</Badge>}
                          </div>
                          <p className="text-xs text-[#9494A8] mt-0.5">
                            {[listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')}
                            {' · '}{listing.bedrooms}bd {listing.bathrooms}ba · {listing.max_guests} guests
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <ScoreBadge score={listing.revenue_potential_score} />
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${bucket.color}`}>{bucket.emoji} {bucket.label}</span>
                            <span className="text-[10px] text-[#9494A8]">
                              {listing.host_type === 'diy' ? '🏠 DIY' : listing.host_type === 'scaling' ? '📈 Scaling' : '🏢 Pro'}
                              {listing.host_listing_count ? ` · ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''}
                            </span>
                            {pricingGap && pricingGap > 5 && <span className="text-[10px] text-orange-400">↑ ${pricingGap} below mkt</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
                          {listing.avg_rating && <div className="flex items-center gap-1 text-[#F59E0B]"><Star className="h-3 w-3" /><span>{listing.avg_rating.toFixed(1)}</span><span className="text-[#5C5C72]">({listing.total_reviews})</span></div>}
                          {listing.ttm_avg_rate && <div className="flex items-center gap-1 text-[#9494A8]"><DollarSign className="h-3 w-3" /><span>${Math.round(listing.ttm_avg_rate)}/night</span></div>}
                          {listing.ttm_revenue && <div className="flex items-center gap-1 text-[#22C55E]"><TrendingUp className="h-3 w-3" /><span>${Math.round(listing.ttm_revenue / 1000)}k/yr</span></div>}
                          <div className="flex items-center gap-2 mt-0.5">
                            <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-[#6366F1] hover:text-[#818CF8]"><ExternalLink className="h-3 w-3" /></a>
                            <button onClick={e => { e.stopPropagation(); setExpanded(prev => { const n = new Set(prev); n.has(listing.listing_id) ? n.delete(listing.listing_id) : n.add(listing.listing_id); return n }) }} className="text-[#5C5C72] hover:text-[#9494A8]">
                              {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail panel */}
                    {isExpanded && (
                      <div className="border-t border-[#2A2A3C] px-3 py-3 space-y-3 text-xs">
                        {/* Score breakdown */}
                        <div>
                          <p className="text-[#9494A8] font-medium mb-2">📊 How this score was calculated</p>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              {
                                label: 'Pricing Gap',
                                value: listing.pricing_opportunity_score,
                                desc: listing.market_avg_price && listing.ttm_avg_rate
                                  ? `This listing charges $${Math.round(listing.ttm_avg_rate)}/night. Market average is $${Math.round(listing.market_avg_price)}/night — ${listing.ttm_avg_rate < listing.market_avg_price ? `$${Math.round(listing.market_avg_price - listing.ttm_avg_rate)} below market avg` : 'at or above market rate'}`
                                  : 'Market pricing data unavailable for this area.',
                              },
                              {
                                label: 'Listing Quality Gap',
                                value: listing.listing_quality_score,
                                desc: `${listing.photo_count ?? 'Unknown'} photos · ${listing.amenities_count ?? 'Unknown'} amenities listed. ${(listing.photo_count ?? 0) < 15 ? 'Low photo count - strong optimization opportunity.' : 'Photo count looks adequate.'} ${(listing.amenities_count ?? 0) < 8 ? 'Few amenities listed - may be missing important features.' : ''}`.trim(),
                              },
                              {
                                label: 'Review Momentum',
                                value: listing.review_momentum_score,
                                desc: `${listing.total_reviews} total reviews · ${listing.avg_rating?.toFixed(1) ?? 'No'} star rating. ${listing.total_reviews < 80 ? 'Under 80 reviews - still building momentum, strong upside.' : 'Well-established review history.'} ${listing.avg_rating && listing.avg_rating >= 4.4 && listing.avg_rating <= 4.8 ? 'Rating in the 4.4–4.8 sweet spot - good but improvable.' : listing.avg_rating && listing.avg_rating < 4.4 ? 'Below 4.4 rating - significant improvement opportunity.' : ''}`.trim(),
                              },
                              {
                                label: 'Host Profile',
                                value: null,
                                desc: listing.host_type === 'diy'
                                  ? `DIY host${listing.host_listing_count ? ` with ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''}. Likely self-managing — prime consulting target.`
                                  : listing.host_type === 'scaling'
                                  ? `Scaling host with ${listing.host_listing_count} listings. Growing operator who may want professional help.`
                                  : 'Professional operator — less likely to need consulting.',
                              },
                              {
                                label: 'Market Demand',
                                value: null,
                                desc: listing.market_avg_occupancy
                                  ? `Market average occupancy: ${Math.round(listing.market_avg_occupancy * 100)}%. ${listing.market_avg_occupancy >= 0.65 ? 'Strong demand market — good conditions for revenue growth.' : 'Moderate demand — opportunity depends on positioning.'}`
                                  : 'Market occupancy data unavailable.',
                              },
                              {
                                label: 'Annual Revenue vs Market',
                                value: null,
                                desc: listing.ttm_revenue && listing.market_avg_revenue
                                  ? `This listing earned $${Math.round(listing.ttm_revenue / 1000)}k last 12 months. Market average is $${Math.round(listing.market_avg_revenue / 1000)}k/year. ${listing.ttm_revenue < listing.market_avg_revenue ? `$${Math.round((listing.market_avg_revenue - listing.ttm_revenue) / 1000)}k below market — clear revenue upside.` : 'At or above market average.'}`
                                  : listing.ttm_revenue ? `Earned $${Math.round(listing.ttm_revenue / 1000)}k last 12 months. No market comparison available.` : 'Revenue data unavailable.',
                              },
                            ].map(item => (
                              <div key={item.label} className="bg-[#0A0A0F] rounded p-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[#9494A8] font-medium">{item.label}</span>
                                  {item.value !== null && item.value !== undefined && (
                                    <span className={`font-mono font-bold text-sm ${item.value >= 65 ? 'text-green-400' : item.value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{item.value}</span>
                                  )}
                                </div>
                                <p className="text-[#9494A8] leading-relaxed">{item.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* AI analysis */}
                        {(listing.opportunity_notes || listing.outreach_angle) ? (
                          <div className="space-y-2">
                            {listing.opportunity_notes && (
                              <div className="bg-[#0A0A0F] rounded p-2.5">
                                <p className="text-[#6366F1] font-medium mb-1">💡 Primary Opportunity</p>
                                <p className="text-[#F0F0F5] leading-relaxed break-words whitespace-normal">{listing.opportunity_notes}</p>
                              </div>
                            )}
                            {listing.outreach_angle && (
                              <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded p-2.5">
                                <p className="text-[#6366F1] font-medium mb-1">✉️ Suggested Outreach</p>
                                <p className="text-[#F0F0F5] leading-relaxed italic break-words whitespace-normal">&ldquo;{listing.outreach_angle}&rdquo;</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[#5C5C72] text-center italic py-1">AI analysis available for listings with score ≥ 40 when OpenAI is configured.</p>
                        )}
                      </div>
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
