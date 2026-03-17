'use client'

import React, { useState } from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Search,
  ExternalLink,
  Star,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { ScoreBadge } from '@/components/scoring/score-badge'
import { cn } from '@/lib/utils'

export interface ListingRow {
  id: string
  listing_id: string
  listing_url: string
  listing_title: string
  city: string
  state: string
  bedrooms: number
  bathrooms: number
  max_guests: number
  nightly_rate: number | null
  avg_rating: number | null
  total_reviews: number
  host_name: string | null
  superhost: boolean
  lead_score: number | null
  lead_tier: 'strong' | 'moderate' | 'weak' | 'unscored' | 'excluded' | null
  // Extended fields for detail panel
  host_listing_count?: number | null
  host_type?: string | null
  photo_count?: number | null
  amenities_count?: number | null
  ttm_avg_rate?: number | null
  ttm_revenue?: number | null
  ttm_occupancy?: number | null
  market_avg_price?: number | null
  market_avg_occupancy?: number | null
  market_avg_revenue?: number | null
  pricing_opportunity_score?: number | null
  listing_quality_score?: number | null
  review_momentum_score?: number | null
  opportunity_notes?: string | null
  outreach_angle?: string | null
  ai_lead_score?: number | null
  ai_bucket?: string | null
  // New opportunity scoring fields
  opportunity_score?: number | null
  lead_priority_rank?: string | null
  recommended_outreach_reason?: string | null
  occupancy_gap_score?: number | null
  revpan_gap_score?: number | null
  pricing_inefficiency_score?: number | null
  listing_quality_gap_score?: number | null
  momentum_score?: number | null
  host_profile_score?: number | null
  occupancy_delta?: number | null
  revpan_delta?: number | null
  adr_delta?: number | null
  momentum_signal?: number | null
  estimated_revenue_upside?: number | null
  estimated_upside_pct?: number | null
  cohost_presence?: boolean
  professional_management?: boolean
  is_favorited?: boolean | null
}

interface ListingsTableProps {
  data: ListingRow[]
  onRowClick?: (listing: ListingRow) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  hot: { label: 'HOT', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  warm: { label: 'WARM', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  cold: { label: 'COLD', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  excluded: { label: 'EXCL', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

export function ListingsTable({ data, onRowClick, selectable, selectedIds = [], onSelectionChange }: ListingsTableProps) {
  const toggleRow = (id: string) => {
    if (!onSelectionChange) return
    onSelectionChange(
      selectedIds.includes(id) ? selectedIds.filter(x => x !== id) : [...selectedIds, id]
    )
  }
  const toggleAll = () => {
    if (!onSelectionChange) return
    onSelectionChange(selectedIds.length === data.length ? [] : data.map(r => r.id))
  }
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const toggleExpand = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteState, setFavoriteState] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {}
    data.forEach(r => { if (r.is_favorited) map[r.id] = true })
    return map
  })

  const toggleFavorite = async (id: string) => {
    const current = favoriteState[id] ?? false
    const next = !current
    setFavoriteState(prev => ({ ...prev, [id]: next }))
    try {
      const res = await fetch('/api/listings/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: id, favorited: next }),
      })
      if (!res.ok) setFavoriteState(prev => ({ ...prev, [id]: current }))
    } catch {
      setFavoriteState(prev => ({ ...prev, [id]: current }))
    }
  }

  const filteredData = favoritesOnly ? data.filter(r => favoriteState[r.id]) : data

  const selectColumn: ColumnDef<ListingRow> = {
    id: 'select',
    header: () => (
      <input type="checkbox" checked={selectedIds.length === data.length && data.length > 0} onChange={toggleAll} className="rounded" />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={selectedIds.includes(row.original.id)}
        onChange={() => toggleRow(row.original.id)}
        onClick={e => e.stopPropagation()}
        className="rounded"
      />
    ),
    size: 40,
  }

  const expandColumn: ColumnDef<ListingRow> = {
    id: 'expand',
    header: '',
    cell: ({ row }) => {
      const isExpanded = expandedRows.has(row.original.id)
      return (
        <button
          onClick={e => { e.stopPropagation(); toggleExpand(row.original.id) }}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
            isExpanded
              ? 'bg-[#6366F1]/20 text-[#818CF8] ring-1 ring-[#6366F1]/30'
              : 'bg-[#1c1d2b] text-[#c4c5d6] hover:bg-[#2f3247] hover:text-[#f0f0f6]'
          )}
          aria-label={isExpanded ? 'Collapse row' : 'Expand row'}
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      )
    },
    size: 48,
  }

  const favoriteColumn: ColumnDef<ListingRow> = {
    id: 'favorite',
    header: '',
    cell: ({ row }) => {
      const isFav = favoriteState[row.original.id] ?? false
      return (
        <button
          onClick={e => { e.stopPropagation(); toggleFavorite(row.original.id) }}
          className={cn(
            'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
            isFav
              ? 'text-[#F59E0B]'
              : 'text-[#9395a8] hover:text-[#F59E0B]/60'
          )}
          aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={cn('h-4 w-4', isFav && 'fill-[#F59E0B]')} />
        </button>
      )
    },
    size: 40,
  }

  const columns: ColumnDef<ListingRow>[] = [
    ...(selectable ? [selectColumn] : []),
    expandColumn,
    favoriteColumn,
    {
      accessorKey: 'lead_score',
      header: 'Score',
      cell: ({ row }) => (
        <ScoreBadge
          score={row.original.lead_score}
          tier={row.original.lead_tier}
        />
      ),
      size: 80,
    },
    {
      id: 'opportunity',
      accessorKey: 'opportunity_score',
      header: 'Opportunity',
      cell: ({ row }) => {
        const opp = row.original.opportunity_score
        const priority = row.original.lead_priority_rank
        const upside = row.original.estimated_revenue_upside
        const badge = priority ? PRIORITY_BADGE[priority] : null

        return (
          <div className="flex flex-col items-start gap-1.5">
            <div className="flex items-center gap-2">
              {opp !== null && opp !== undefined ? (
                <span className={cn(
                  'font-mono font-bold text-sm',
                  opp >= 70 ? 'text-red-400' :
                  opp >= 50 ? 'text-orange-400' :
                  opp >= 30 ? 'text-yellow-400' :
                  'text-green-400'
                )}>
                  {opp}
                </span>
              ) : (
                <span className="text-[#9395a8] text-sm">—</span>
              )}
              {badge && (
                <span className={cn('text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border', badge.className)}>
                  {badge.label}
                </span>
              )}
            </div>
            {upside && (
              <span className="text-xs text-emerald-400 font-mono">
                +${upside.toLocaleString()}
              </span>
            )}
          </div>
        )
      },
      size: 130,
    },
    {
      accessorKey: 'listing_title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <p className="font-medium text-[#f0f0f6] truncate text-[15px] leading-snug">
            {row.original.listing_title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-[#c4c5d6]">
            <MapPin className="h-3 w-3 text-[#9395a8]" />
            {row.original.city}, {row.original.state}
          </div>
        </div>
      ),
      size: 300,
    },
    {
      id: 'location',
      accessorFn: (row) => `${row.city}, ${row.state}`,
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-[#c4c5d6]">
          {row.original.city}, {row.original.state}
        </span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: 'nightly_rate',
      header: 'Rate',
      cell: ({ row }) => (
        <span className="font-mono font-semibold text-[#f0f0f6]">
          {row.original.nightly_rate
            ? `$${row.original.nightly_rate.toFixed(0)}`
            : '—'}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'avg_rating',
      header: 'Rating',
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-[#F59E0B] fill-[#F59E0B]" />
          <span className="font-mono font-semibold text-[#f0f0f6]">
            {row.original.avg_rating?.toFixed(1) || '—'}
          </span>
        </div>
      ),
      size: 90,
    },
    {
      accessorKey: 'total_reviews',
      header: 'Reviews',
      cell: ({ row }) => (
        <span className="font-mono text-[#c4c5d6]">
          {row.original.total_reviews}
        </span>
      ),
      size: 80,
    },
    {
      id: 'specs',
      header: 'Specs',
      cell: ({ row }) => (
        <span className="text-[15px] text-[#c4c5d6]">
          {row.original.bedrooms}BR · {row.original.bathrooms}BA · {row.original.max_guests}G
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: 'host_name',
      header: 'Host',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-[#f0f0f6] truncate max-w-[120px]">
            {row.original.host_name || '—'}
          </span>
          {row.original.superhost && (
            <Badge variant="secondary" className="bg-[#F59E0B]/15 text-[#F59E0B] text-[10px] px-1.5 border border-[#F59E0B]/25">
              SH
            </Badge>
          )}
        </div>
      ),
      size: 160,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <a
          href={row.original.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[#9395a8] hover:text-[#818CF8] hover:bg-[#6366F1]/10 transition-colors"
          onClick={(e) => e.stopPropagation()}
          aria-label="Open listing"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ),
      size: 48,
    },
  ]

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: 'includesString',
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    initialState: {
      pagination: { pageSize: 25 },
      columnVisibility: { location: false },
    },
  })

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setFavoritesOnly(false)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
            !favoritesOnly
              ? 'bg-[#6366F1]/15 text-[#818CF8] border border-[#6366F1]/30'
              : 'text-[#9395a8] hover:text-[#c4c5d6] hover:bg-[#1c1d2b]'
          )}
        >
          All
        </button>
        <button
          onClick={() => setFavoritesOnly(true)}
          className={cn(
            'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
            favoritesOnly
              ? 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30'
              : 'text-[#9395a8] hover:text-[#c4c5d6] hover:bg-[#1c1d2b]'
          )}
        >
          <Star className="h-3.5 w-3.5 fill-current" />
          Favorites
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9395a8]" />
          <Input
            placeholder="Search listings..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 h-10 bg-[#1c1d2b] border-[#363a4f] text-[#f0f0f6] placeholder:text-[#9395a8] focus:border-[#6366F1]/50 focus:ring-[#6366F1]/20"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-[#363a4f] text-[#c4c5d6] hover:bg-[#262838] hover:text-[#f0f0f6]">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1c1d2b] border-[#363a4f]">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize text-[#f0f0f6]"
                  checked={column.getIsVisible()}
                  onCheckedChange={(value) => column.toggleVisibility(!!value)}
                >
                  {column.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#363a4f] overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#363a4f] bg-[#13141c] hover:bg-[#13141c]">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[13px] font-semibold text-[#c4c5d6] uppercase tracking-wider py-4"
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className={cn(
                      'border-[#2a2d3e] hover:bg-[#262838] cursor-pointer transition-colors',
                      idx % 2 === 1 && 'bg-[#0e0f16]'
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.id) && (
                    <TableRow className="border-[#363a4f]">
                      <TableCell colSpan={columns.length} className="p-0">
                        <ListingDetailPanel listing={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#9395a8]">
                  No listings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-[15px] text-[#c4c5d6]">
          {filteredData.length > 0
            ? `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                filteredData.length
              )} of ${filteredData.length} listings`
            : 'No listings'}
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="border-[#363a4f] text-[#c4c5d6] hover:bg-[#262838] disabled:opacity-30"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="border-[#363a4f] text-[#c4c5d6] hover:bg-[#262838] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-[15px] text-[#c4c5d6] px-3 tabular-nums">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="border-[#363a4f] text-[#c4c5d6] hover:bg-[#262838] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            className="border-[#363a4f] text-[#c4c5d6] hover:bg-[#262838] disabled:opacity-30"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function diagnosePrimaryIssue(listing: ListingRow): {
  issue: string
  conclusion: string
} {
  const occDelta = listing.occupancy_delta
  const adrDelta = listing.adr_delta
  const revpanDelta = listing.revpan_delta
  const momSignal = listing.momentum_signal
  const qualityGap = listing.listing_quality_gap_score ?? 0

  if (adrDelta !== null && adrDelta !== undefined && adrDelta > 0 && occDelta !== null && occDelta !== undefined && occDelta < -0.05) {
    return {
      issue: 'Overpricing',
      conclusion: 'High pricing is reducing booking volume and total revenue.',
    }
  }
  if (occDelta !== null && occDelta !== undefined && occDelta > 0.05 && revpanDelta !== null && revpanDelta !== undefined && revpanDelta < 0) {
    return {
      issue: 'Underpricing',
      conclusion: 'High occupancy but below-market revenue — the host could charge more.',
    }
  }
  if (momSignal !== null && momSignal !== undefined && momSignal < -0.15) {
    return {
      issue: 'Declining Performance',
      conclusion: 'Revenue has declined significantly compared to last year.',
    }
  }
  if (qualityGap > 60) {
    return {
      issue: 'Listing Quality Gaps',
      conclusion: 'Photos, amenities, or guest ratings are below competitive listings.',
    }
  }
  return {
    issue: 'Optimization Opportunity',
    conclusion: 'This listing has multiple small inefficiencies that compound into lower revenue.',
  }
}

function fmtPct(val: number, decimals = 0): string {
  return `${val >= 0 ? '+' : ''}${(val * 100).toFixed(decimals)}%`
}

function fmtMoney(val: number): string {
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString()}`
}

function buildEvidenceBullets(listing: ListingRow): string[] {
  const bullets: string[] = []
  const listingAdr = listing.nightly_rate ?? listing.ttm_avg_rate
  const marketAdr = listing.market_avg_price

  if (listing.adr_delta !== null && listing.adr_delta !== undefined && listingAdr && marketAdr) {
    const pct = marketAdr !== 0 ? Math.round((listing.adr_delta / marketAdr) * 100) : 0
    const dir = listing.adr_delta > 0 ? 'above' : 'below'
    bullets.push(`ADR is ${Math.abs(pct)}% ${dir} market ($${Math.round(listingAdr)} vs $${Math.round(marketAdr)})`)
  }

  const listingOcc = listing.ttm_occupancy
  const marketOcc = listing.market_avg_occupancy
  if (listing.occupancy_delta !== null && listing.occupancy_delta !== undefined) {
    const dir = listing.occupancy_delta > 0 ? 'above' : 'below'
    const listingPct = listingOcc !== null && listingOcc !== undefined ? `${Math.round(listingOcc * 100)}%` : '—'
    const marketPct = marketOcc !== null && marketOcc !== undefined ? `${Math.round(marketOcc * 100)}%` : '—'
    bullets.push(`Occupancy is ${Math.abs(Math.round(listing.occupancy_delta * 100))}% ${dir} market (${listingPct} vs ${marketPct})`)
  }

  if (listing.revpan_delta !== null && listing.revpan_delta !== undefined) {
    const dir = listing.revpan_delta > 0 ? 'above' : 'below'
    const listingRevpar = listingAdr && listingOcc ? Math.round(listingAdr * listingOcc) : null
    const marketRevpar = marketAdr && marketOcc ? Math.round(marketAdr * marketOcc) : null
    const pct = marketRevpar ? Math.round((listing.revpan_delta / marketRevpar) * 100) : null
    const pctStr = pct !== null ? `${Math.abs(pct)}% ` : ''
    const vals = listingRevpar && marketRevpar ? ` ($${listingRevpar} vs $${marketRevpar})` : ''
    bullets.push(`RevPAR is ${pctStr}${dir} market${vals}`)
  }

  if (listing.momentum_signal !== null && listing.momentum_signal !== undefined) {
    const dir = listing.momentum_signal > 0 ? 'up' : 'down'
    bullets.push(`Revenue trending ${dir} ${Math.abs(Math.round(listing.momentum_signal * 100))}% vs last year`)
  }

  return bullets
}

// ─── Listing Detail Panel ──────────────────────────────────────────────────────


// ─── Listing Detail Panel ──────────────────────────────────────────────────────

function ListingDetailPanel({ listing }: { listing: ListingRow }) {
  const oppScore = listing.opportunity_score ?? listing.lead_score ?? 0
  const priority = listing.lead_priority_rank
  const priorityBadge = priority ? PRIORITY_BADGE[priority] : null
  const diagnosis = diagnosePrimaryIssue(listing)
  const evidence = buildEvidenceBullets(listing)

  // Metrics table data
  const listingAdr = listing.nightly_rate ?? listing.ttm_avg_rate
  const marketAdr = listing.market_avg_price
  const listingOcc = listing.ttm_occupancy
  const marketOcc = listing.market_avg_occupancy
  const listingRevpar = listingAdr && listingOcc ? listingAdr * listingOcc : null
  const marketRevpar = marketAdr && marketOcc ? marketAdr * marketOcc : null
  const listingRevenue = listing.ttm_revenue
  const marketRevenue = listing.market_avg_revenue

  type MetricRow = {
    label: string
    listing: string
    market: string
    diff: string | null
    diffNum: number | null
    isBad: boolean
  }

  const metrics: MetricRow[] = [
    (() => {
      const diff = listing.adr_delta ?? (listingAdr && marketAdr ? listingAdr - marketAdr : null)
      const pct = marketAdr && diff !== null ? diff / marketAdr : null
      const isBad = diagnosis.issue === 'Overpricing' ? (diff !== null && diff > 0) : (diff !== null && diff < 0)
      return {
        label: 'ADR',
        listing: listingAdr ? `$${Math.round(listingAdr)}` : '—',
        market: marketAdr ? `$${Math.round(marketAdr)}` : '—',
        diff: pct !== null ? fmtPct(pct) : null,
        diffNum: pct,
        isBad,
      }
    })(),
    (() => {
      const delta = listing.occupancy_delta
      const isBad = delta !== null && delta !== undefined && delta < 0
      return {
        label: 'Occupancy',
        listing: listingOcc !== null && listingOcc !== undefined ? `${Math.round(listingOcc * 100)}%` : '—',
        market: marketOcc !== null && marketOcc !== undefined ? `${Math.round(marketOcc * 100)}%` : '—',
        diff: delta !== null && delta !== undefined ? fmtPct(delta) : null,
        diffNum: delta ?? null,
        isBad,
      }
    })(),
    (() => {
      const diff = listing.revpan_delta ?? (listingRevpar && marketRevpar ? listingRevpar - marketRevpar : null)
      const pct = marketRevpar && diff !== null ? diff / marketRevpar : null
      const isBad = diff !== null && diff < 0
      return {
        label: 'RevPAR',
        listing: listingRevpar !== null ? `$${Math.round(listingRevpar)}` : '—',
        market: marketRevpar !== null ? `$${Math.round(marketRevpar)}` : '—',
        diff: pct !== null ? fmtPct(pct) : null,
        diffNum: pct,
        isBad,
      }
    })(),
    (() => {
      const diff = listingRevenue && marketRevenue ? listingRevenue - marketRevenue : null
      const pct = marketRevenue && diff !== null ? diff / marketRevenue : null
      const isBad = diff !== null && diff < 0
      return {
        label: 'Annual Revenue',
        listing: listingRevenue ? fmtMoney(listingRevenue) : '—',
        market: marketRevenue ? fmtMoney(marketRevenue) : '—',
        diff: pct !== null ? fmtPct(pct) : null,
        diffNum: pct,
        isBad,
      }
    })(),
  ]

  // Determine upside explanation
  const upsideExplanation = diagnosis.issue === 'Overpricing'
    ? 'Based on closing the occupancy gap to market average'
    : diagnosis.issue === 'Underpricing'
    ? 'Based on raising ADR to market rate while maintaining occupancy'
    : listing.occupancy_delta !== null && listing.occupancy_delta !== undefined && listing.occupancy_delta < -0.05
    ? 'Based on closing the occupancy gap to market average'
    : listing.revpan_delta !== null && listing.revpan_delta !== undefined && listing.revpan_delta < 0
    ? 'Based on closing the RevPAR gap to market average'
    : 'Based on combined pricing and occupancy optimization'

  return (
    <div className="px-6 py-5 space-y-5 text-[15px] bg-[#0e0f16] border-t border-[#363a4f] overflow-hidden">
      {/* A) Header row */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className={cn(
          'font-mono font-bold text-lg px-2.5 py-1 rounded-lg',
          oppScore >= 70 ? 'bg-red-500/10 text-red-400' :
          oppScore >= 50 ? 'bg-orange-500/10 text-orange-400' :
          oppScore >= 30 ? 'bg-yellow-500/10 text-yellow-400' :
          'bg-green-500/10 text-green-400'
        )}>
          {oppScore}
        </span>
        {priorityBadge && (
          <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border', priorityBadge.className)}>
            {priorityBadge.label}
          </span>
        )}
        {listing.estimated_revenue_upside && (
          <span className="text-emerald-400 font-mono font-bold text-sm">
            +${listing.estimated_revenue_upside.toLocaleString()}/yr
          </span>
        )}
      </div>

      {/* B) Primary Diagnosis */}
      <div className="bg-[#13141c] border border-[#2a2d3e] rounded-lg p-4">
        <p className="text-[#f0f0f6] font-medium mb-2 text-sm">
          🔍 Primary Issue: {diagnosis.issue}
        </p>
        {evidence.length > 0 && (
          <div className="mb-2 space-y-1">
            <p className="text-[#c4c5d6] font-medium">Evidence:</p>
            {evidence.map((bullet, i) => (
              <p key={i} className="text-[#f0f0f6] leading-relaxed pl-3">• {bullet}</p>
            ))}
          </div>
        )}
        <p className="text-[#c4c5d6] italic">{diagnosis.conclusion}</p>
      </div>

      {/* C) Key Metrics table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#c4c5d6] border-b border-[#2a2d3e]">
              <th className="text-left py-1.5 pr-4 font-medium">Metric</th>
              <th className="text-right py-1.5 px-3 font-medium">Listing</th>
              <th className="text-right py-1.5 px-3 font-medium">Market</th>
              <th className="text-right py-1.5 pl-3 font-medium">Diff</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(row => (
              <tr key={row.label} className="border-b border-[#2a2d3e]/50">
                <td className="py-1.5 pr-4 text-[#c4c5d6] font-medium">{row.label}</td>
                <td className="py-1.5 px-3 text-right font-mono text-[#f0f0f6]">{row.listing}</td>
                <td className="py-1.5 px-3 text-right font-mono text-[#c4c5d6]">{row.market}</td>
                <td className={cn(
                  'py-1.5 pl-3 text-right font-mono font-semibold',
                  row.diff === null ? 'text-[#9395a8]' :
                  row.isBad ? 'text-red-400' :
                  row.diffNum !== null && row.diffNum !== 0 ? 'text-emerald-400' :
                  'text-[#c4c5d6]'
                )}>
                  {row.diff ?? '—'} {row.diff !== null && (row.diffNum !== null && row.diffNum > 0 ? '⬆' : row.diffNum !== null && row.diffNum < 0 ? '⬇' : '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* D) Revenue Upside */}
      {(listing.estimated_revenue_upside || listing.estimated_upside_pct) && (
        <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-lg p-4">
          <p className="text-emerald-400 font-semibold text-sm uppercase tracking-wider mb-1.5">💰 Estimated Revenue Opportunity</p>
          <p className="text-[#f0f0f6] font-mono font-bold text-base">
            {listing.estimated_revenue_upside && `+$${listing.estimated_revenue_upside.toLocaleString()}/year`}
            {listing.estimated_upside_pct && ` (+${Math.round(listing.estimated_upside_pct * 100)}%)`}
          </p>
          <p className="text-[#c4c5d6] mt-1">{upsideExplanation}</p>
        </div>
      )}

      {/* E) Host & Listing Info */}
      <div className="flex items-center gap-4 text-[#c4c5d6] flex-wrap pt-1 border-t border-[#363a4f]">
        {listing.host_name && <span>{listing.host_name}{listing.superhost ? ' (Superhost)' : ''}</span>}
        {listing.host_type && <span className="capitalize">{listing.host_type}</span>}
        {listing.host_listing_count && <span>{listing.host_listing_count} listing{listing.host_listing_count > 1 ? 's' : ''}</span>}
        <span>{listing.bedrooms}BR · {listing.bathrooms}BA · {listing.max_guests}G</span>
        {listing.photo_count && <span>{listing.photo_count} photos</span>}
        {listing.amenities_count && <span>{listing.amenities_count} amenities</span>}
        <a
          href={listing.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6366F1] hover:text-[#818CF8] flex items-center gap-1"
        >
          View listing <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      {/* F) AI analysis */}
      {(listing.opportunity_notes || listing.outreach_angle) && (
        <div className="grid grid-cols-1 gap-3 min-w-0">
          {listing.opportunity_notes && (
            <div className="bg-[#13141c] border border-[#2a2d3e] rounded-lg p-4">
              <p className="text-[#818CF8] font-semibold text-sm uppercase tracking-wider mb-2">Primary Opportunity</p>
              <p className="text-[#f0f0f6] leading-relaxed break-words whitespace-normal">{listing.opportunity_notes}</p>
            </div>
          )}
          {listing.outreach_angle && (
            <div className="bg-[#6366F1]/8 border border-[#6366F1]/25 rounded-lg p-4">
              <p className="text-[#818CF8] font-semibold text-sm uppercase tracking-wider mb-2">Suggested Outreach</p>
              <p className="text-[#f0f0f6] leading-relaxed italic break-words whitespace-normal">&ldquo;{listing.outreach_angle}&rdquo;</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
