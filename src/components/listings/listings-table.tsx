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

  const columns: ColumnDef<ListingRow>[] = [
    ...(selectable ? [selectColumn] : []),
    expandColumn,
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
          <p className="font-medium text-[#f0f0f6] truncate text-[13px] leading-snug">
            {row.original.listing_title}
          </p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-[#c4c5d6]">
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
        <span className="text-sm text-[#c4c5d6]">
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
    data,
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
                    className="text-xs font-semibold text-[#c4c5d6] uppercase tracking-wider py-3.5"
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
                      <TableCell key={cell.id} className="py-3.5">
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
        <p className="text-sm text-[#c4c5d6]">
          {data.length > 0
            ? `Showing ${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                data.length
              )} of ${data.length} listings`
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
          <span className="text-sm text-[#c4c5d6] px-3 tabular-nums">
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

// ─── Listing Detail Panel ──────────────────────────────────────────────────────

const bucketConfig: Record<string, { emoji: string; label: string }> = {
  strong_lead:              { emoji: '⚡', label: 'Strong Lead' },
  pricing_opportunity:      { emoji: '💰', label: 'Pricing Opportunity' },
  optimization_opportunity: { emoji: '📸', label: 'Needs Optimization' },
  multi_listing_host:       { emoji: '🔄', label: 'Scaling Host' },
  weak_lead:                { emoji: '❌', label: 'Weak Lead' },
}

const HOST_TYPE_LABELS: Record<string, string> = {
  independent: '🏠 Independent Host',
  scaling: '📈 Scaling Host',
  professional: '🏢 Professional',
  diy: '🏠 DIY Host',
}

function ListingDetailPanel({ listing }: { listing: ListingRow }) {
  const bucket = bucketConfig[listing.ai_bucket ?? 'weak_lead'] ?? bucketConfig.weak_lead
  const pricingGap = listing.market_avg_price && listing.ttm_avg_rate
    ? Math.round(listing.market_avg_price - listing.ttm_avg_rate)
    : null
  const oppScore = listing.opportunity_score ?? listing.lead_score ?? 0
  const priority = listing.lead_priority_rank
  const priorityBadge = priority ? PRIORITY_BADGE[priority] : null

  return (
    <div className="px-6 py-5 space-y-5 text-sm bg-[#0e0f16] border-t border-[#363a4f]">
      {/* Header */}
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
        <span className="text-[#f0f0f6] font-medium">{bucket.emoji} {bucket.label}</span>
        <span className="text-[#c4c5d6]">
          {HOST_TYPE_LABELS[listing.host_type ?? 'independent'] ?? listing.host_type}
          {listing.host_listing_count ? ` · ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''}
        </span>
        {pricingGap && pricingGap > 5 && <span className="text-orange-400 font-medium">↑ ${pricingGap} below market</span>}
        {listing.estimated_revenue_upside && (
          <span className="text-emerald-400 font-mono font-semibold">+${listing.estimated_revenue_upside.toLocaleString()} upside</span>
        )}
      </div>

      {/* Outreach reason callout */}
      {listing.recommended_outreach_reason && (
        <div className="bg-[#6366F1]/8 border border-[#6366F1]/25 rounded-lg p-4">
          <p className="text-[#818CF8] font-semibold text-xs uppercase tracking-wider mb-1.5">Outreach Signal</p>
          <p className="text-[#f0f0f6] leading-relaxed">{listing.recommended_outreach_reason}</p>
        </div>
      )}

      {/* Score breakdown */}
      <div>
        <p className="text-[#c4c5d6] font-semibold text-xs uppercase tracking-wider mb-3">Score Breakdown</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            {
              label: 'Occupancy Gap',
              value: listing.occupancy_gap_score,
              desc: listing.occupancy_delta !== null && listing.occupancy_delta !== undefined
                ? `${listing.occupancy_delta > 0 ? '+' : ''}${Math.round(listing.occupancy_delta * 100)}% vs market occupancy`
                : listing.market_avg_occupancy
                  ? `Market avg ${Math.round(listing.market_avg_occupancy * 100)}% occupancy`
                  : 'Market occupancy data unavailable.',
            },
            {
              label: 'RevPAR Gap',
              value: listing.revpan_gap_score,
              desc: listing.revpan_delta !== null && listing.revpan_delta !== undefined
                ? `$${Math.round(listing.revpan_delta)} vs market RevPAR`
                : 'RevPAR comparison data unavailable.',
            },
            {
              label: 'Pricing Efficiency',
              value: listing.pricing_inefficiency_score ?? listing.pricing_opportunity_score,
              desc: listing.adr_delta !== null && listing.adr_delta !== undefined
                ? `ADR $${Math.round(listing.adr_delta)} vs market${listing.adr_delta > 0 ? ' (above)' : ' (below)'}`
                : listing.market_avg_price && listing.ttm_avg_rate
                  ? `$${Math.round(listing.ttm_avg_rate)}/night vs $${Math.round(listing.market_avg_price)} market avg`
                  : 'Market pricing data unavailable.',
            },
            {
              label: 'Listing Quality',
              value: listing.listing_quality_gap_score ?? (listing.listing_quality_score !== null && listing.listing_quality_score !== undefined ? 100 - listing.listing_quality_score : null),
              desc: `${listing.photo_count ?? '?'} photos, ${listing.amenities_count ?? '?'} amenities.${(listing.photo_count ?? 15) < 15 ? ' Low photo count.' : ''}${(listing.amenities_count ?? 8) < 8 ? ' Few amenities.' : ''}`,
            },
            {
              label: 'Momentum',
              value: listing.momentum_score ?? listing.review_momentum_score,
              desc: listing.momentum_signal !== null && listing.momentum_signal !== undefined
                ? `Revenue ${listing.momentum_signal > 0 ? 'up' : 'down'} ${Math.round(Math.abs(listing.momentum_signal) * 100)}% vs last year`
                : `${listing.total_reviews} reviews, ${listing.avg_rating?.toFixed(1) ?? '?'}★`,
            },
            {
              label: 'Host Profile',
              value: listing.host_profile_score,
              desc: listing.host_type === 'independent'
                ? `Independent host${listing.host_listing_count ? ` with ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''} — prime target.`
                : listing.host_type === 'scaling'
                ? `Scaling host with ${listing.host_listing_count ?? '?'} listings.`
                : listing.host_type === 'professional'
                ? 'Professional operator.'
                : `${listing.host_listing_count ?? '?'} listings.`,
            },
          ].map(item => (
            <div key={item.label} className="bg-[#13141c] rounded-lg p-3.5 border border-[#2a2d3e]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[#c4c5d6] font-medium text-xs">{item.label}</span>
                {item.value !== null && item.value !== undefined && (
                  <span className={cn(
                    'font-mono font-bold text-sm',
                    (item.value as number) >= 65 ? 'text-red-400' : (item.value as number) >= 40 ? 'text-orange-400' : 'text-green-400'
                  )}>{item.value}</span>
                )}
              </div>
              <p className="text-[#9395a8] leading-relaxed text-xs">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue upside estimate */}
      {(listing.estimated_revenue_upside || listing.estimated_upside_pct) && (
        <div className="bg-emerald-500/8 border border-emerald-500/25 rounded-lg p-4">
          <p className="text-emerald-400 font-semibold text-xs uppercase tracking-wider mb-1.5">Revenue Upside Estimate</p>
          <p className="text-[#f0f0f6] leading-relaxed">
            {listing.estimated_revenue_upside && `$${listing.estimated_revenue_upside.toLocaleString()} estimated annual upside`}
            {listing.estimated_upside_pct && ` (${Math.round(listing.estimated_upside_pct * 100)}% improvement potential)`}
          </p>
        </div>
      )}

      {/* AI analysis */}
      {(listing.opportunity_notes || listing.outreach_angle) ? (
        <div className="grid grid-cols-1 gap-3 min-w-0">
          {listing.opportunity_notes && (
            <div className="bg-[#13141c] border border-[#2a2d3e] rounded-lg p-4">
              <p className="text-[#818CF8] font-semibold text-xs uppercase tracking-wider mb-2">Primary Opportunity</p>
              <p className="text-[#f0f0f6] leading-relaxed break-words whitespace-normal">{listing.opportunity_notes}</p>
            </div>
          )}
          {listing.outreach_angle && (
            <div className="bg-[#6366F1]/8 border border-[#6366F1]/25 rounded-lg p-4">
              <p className="text-[#818CF8] font-semibold text-xs uppercase tracking-wider mb-2">Suggested Outreach</p>
              <p className="text-[#f0f0f6] leading-relaxed italic break-words whitespace-normal">&ldquo;{listing.outreach_angle}&rdquo;</p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[#9395a8] italic">No AI analysis yet. Run &quot;Re-score All&quot; to generate insights.</p>
      )}
    </div>
  )
}
