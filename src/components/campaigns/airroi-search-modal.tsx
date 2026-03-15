'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Download, ExternalLink, Star, DollarSign, TrendingUp } from 'lucide-react'
import { toast } from 'sonner'

interface MappedListing {
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
  annual_revenue: number | null
  occupancy_rate: number | null
  superhost: boolean
  ttm_revenue: number | null
  ttm_occupancy: number | null
  ttm_avg_rate: number | null
}

interface AirROISearchModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  campaignId: string
  onImported: () => void
}

export function AirROISearchModal({ open, onOpenChange, campaignId, onImported }: AirROISearchModalProps) {
  const [locality, setLocality] = useState('')
  const [region, setRegion] = useState('')
  const [country, setCountry] = useState('United States')
  const [isSearching, setIsSearching] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [results, setResults] = useState<MappedListing[]>([])
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

    try {
      const res = await fetch('/api/airroi/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          country: country || 'United States',
          region: region || undefined,
          locality: locality || undefined,
          page_size: 25,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setResults(data.listings || [])
      setSearched(true)
      if (data.listings?.length === 0) {
        toast.info('No listings found. Try broadening your search.')
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
            Search 20M+ STR listings. Filters from your campaign criteria are applied automatically.
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
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching AirROI...</>
          ) : (
            <><Search className="h-4 w-4 mr-2" />Search Listings</>
          )}
        </Button>

        {/* Results */}
        {searched && (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#9494A8]">{results.length} listings found</span>
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
              {results.map(listing => (
                <div
                  key={listing.listing_id}
                  onClick={() => toggleSelect(listing.listing_id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.has(listing.listing_id)
                      ? 'border-[#6366F1] bg-[#6366F1]/10'
                      : 'border-[#2A2A3C] bg-[#1A1A26] hover:border-[#3A3A52]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[#F0F0F5] truncate">{listing.listing_title}</p>
                        {listing.superhost && (
                          <Badge className="bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] px-1 py-0 shrink-0">Superhost</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[#9494A8] mt-0.5">
                        {[listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')}
                        {' · '}{listing.bedrooms}bd {listing.bathrooms}ba · {listing.max_guests} guests
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs">
                      {listing.avg_rating && (
                        <div className="flex items-center gap-1 text-[#F59E0B]">
                          <Star className="h-3 w-3" />
                          <span>{listing.avg_rating.toFixed(1)}</span>
                          <span className="text-[#5C5C72]">({listing.total_reviews})</span>
                        </div>
                      )}
                      {listing.ttm_avg_rate && (
                        <div className="flex items-center gap-1 text-[#9494A8]">
                          <DollarSign className="h-3 w-3" />
                          <span>${Math.round(listing.ttm_avg_rate)}/night</span>
                        </div>
                      )}
                      {listing.ttm_revenue && (
                        <div className="flex items-center gap-1 text-[#22C55E]">
                          <TrendingUp className="h-3 w-3" />
                          <span>${Math.round(listing.ttm_revenue / 1000)}k/yr</span>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
