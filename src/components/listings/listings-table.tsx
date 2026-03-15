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
}

interface ListingsTableProps {
  data: ListingRow[]
  onRowClick?: (listing: ListingRow) => void
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
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
    cell: ({ row }) => (
      <button onClick={e => { e.stopPropagation(); toggleExpand(row.original.id) }} className="text-[#5C5C72] hover:text-[#9494A8] p-1">
        {expandedRows.has(row.original.id) ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    ),
    size: 32,
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
      accessorKey: 'listing_title',
      header: 'Title',
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <p className="font-medium text-[#F0F0F5] truncate">
            {row.original.listing_title}
          </p>
          <div className="flex items-center gap-1 text-xs text-[#9494A8]">
            <MapPin className="h-3 w-3" />
            {row.original.city}, {row.original.state}
          </div>
        </div>
      ),
      size: 280,
    },
    {
      id: 'location',
      accessorFn: (row) => `${row.city}, ${row.state}`,
      header: 'Location',
      cell: ({ row }) => (
        <span className="text-[#9494A8]">
          {row.original.city}, {row.original.state}
        </span>
      ),
      enableHiding: true,
    },
    {
      accessorKey: 'nightly_rate',
      header: 'Rate',
      cell: ({ row }) => (
        <span className="font-mono text-[#F0F0F5]">
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
        <div className="flex items-center gap-1">
          <Star className="h-3 w-3 text-[#F59E0B]" />
          <span className="font-mono text-[#F0F0F5]">
            {row.original.avg_rating?.toFixed(1) || '—'}
          </span>
        </div>
      ),
      size: 80,
    },
    {
      accessorKey: 'total_reviews',
      header: 'Reviews',
      cell: ({ row }) => (
        <span className="font-mono text-[#9494A8]">
          {row.original.total_reviews}
        </span>
      ),
      size: 80,
    },
    {
      id: 'specs',
      header: 'Specs',
      cell: ({ row }) => (
        <span className="text-xs text-[#9494A8]">
          {row.original.bedrooms}BR • {row.original.bathrooms}BA • {row.original.max_guests}G
        </span>
      ),
      size: 100,
    },
    {
      accessorKey: 'host_name',
      header: 'Host',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-[#F0F0F5] truncate max-w-[120px]">
            {row.original.host_name || '—'}
          </span>
          {row.original.superhost && (
            <Badge variant="secondary" className="bg-[#F59E0B]/10 text-[#F59E0B] text-[10px] px-1">
              SH
            </Badge>
          )}
        </div>
      ),
      size: 150,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <a
          href={row.original.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 text-[#5C5C72] hover:text-[#6366F1] transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      ),
      size: 40,
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
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5C5C72]" />
          <Input
            placeholder="Search listings..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-9 bg-[#1A1A26] border-[#2A2A3C] text-[#F0F0F5]"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Columns
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.id}
                  className="capitalize"
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
      <div className="rounded-lg border border-[#2A2A3C] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#1A1A26]">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-[#2A2A3C] hover:bg-[#1A1A26]">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-[#9494A8] font-medium"
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
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.id}>
                  <TableRow
                    className="border-[#2A2A3C] hover:bg-[#1A1A26] cursor-pointer"
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.id) && (
                    <TableRow className="border-[#2A2A3C] bg-[#0A0A0F]">
                      <TableCell colSpan={columns.length} className="p-0">
                        <ListingDetailPanel listing={row.original} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-[#9494A8]">
                  No listings found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-[#9494A8]">
          Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
          {Math.min(
            (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
            data.length
          )}{' '}
          of {data.length} listings
        </p>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-[#9494A8]">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
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

function ListingDetailPanel({ listing }: { listing: ListingRow }) {
  const bucket = bucketConfig[listing.ai_bucket ?? 'weak_lead'] ?? bucketConfig.weak_lead
  const pricingGap = listing.market_avg_price && listing.ttm_avg_rate
    ? Math.round(listing.market_avg_price - listing.ttm_avg_rate)
    : null

  return (
    <div className="px-4 py-4 space-y-4 text-xs border-t border-[#2A2A3C] overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        {listing.lead_score !== null && (
          <span className={`font-mono font-bold text-base px-2 py-0.5 rounded ${(listing.lead_score ?? 0) >= 65 ? 'bg-green-500/10 text-green-400' : (listing.lead_score ?? 0) >= 40 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'}`}>
            {listing.lead_score}
          </span>
        )}
        <span className="text-[#F0F0F5] font-medium">{bucket.emoji} {bucket.label}</span>
        <span className="text-[#9494A8]">
          {listing.host_type === 'diy' ? '🏠 DIY Host' : listing.host_type === 'scaling' ? '📈 Scaling Host' : '🏢 Professional'}
          {listing.host_listing_count ? ` · ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''}
        </span>
        {pricingGap && pricingGap > 5 && <span className="text-orange-400">↑ ${pricingGap} below market</span>}
      </div>

      {/* Score breakdown */}
      <div>
        <p className="text-[#9494A8] font-medium mb-2">📊 How this score was calculated</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {[
            {
              label: 'Pricing Gap',
              value: listing.pricing_opportunity_score,
              desc: listing.market_avg_price && listing.ttm_avg_rate
                ? `$${Math.round(listing.ttm_avg_rate)}/night vs $${Math.round(listing.market_avg_price)} market avg${pricingGap && pricingGap > 0 ? ` - $${pricingGap} below market` : ' - at market rate'}`
                : 'Market pricing data unavailable.',
            },
            {
              label: 'Listing Quality Gap',
              value: listing.listing_quality_score,
              desc: `${listing.photo_count ?? '?'} photos, ${listing.amenities_count ?? '?'} amenities.${(listing.photo_count ?? 15) < 15 ? ' Low photo count - strong optimization opportunity.' : ''}${(listing.amenities_count ?? 8) < 8 ? ' Few amenities listed.' : ''}`,
            },
            {
              label: 'Review Momentum',
              value: listing.review_momentum_score,
              desc: `${listing.total_reviews} reviews, ${listing.avg_rating?.toFixed(1) ?? '?'}★.${(listing.total_reviews ?? 0) < 80 ? ' Under 80 reviews - still building momentum.' : ' Well-established.'}`,
            },
            {
              label: 'Host Profile',
              value: null,
              desc: listing.host_type === 'diy'
                ? `DIY host${listing.host_listing_count ? ` with ${listing.host_listing_count} listing${listing.host_listing_count > 1 ? 's' : ''}` : ''} - prime consulting target.`
                : listing.host_type === 'scaling'
                ? `Scaling host with ${listing.host_listing_count ?? '?'} listings.`
                : 'Professional operator.',
            },
            {
              label: 'Market Demand',
              value: null,
              desc: listing.market_avg_occupancy
                ? `${Math.round(listing.market_avg_occupancy * 100)}% avg market occupancy.${listing.market_avg_occupancy >= 0.65 ? ' Strong demand market.' : ' Moderate demand.'}`
                : 'Market occupancy data unavailable.',
            },
            {
              label: 'Revenue vs Market',
              value: null,
              desc: listing.ttm_revenue && listing.market_avg_revenue
                ? `Earns $${Math.round(listing.ttm_revenue / 1000)}k/yr vs $${Math.round(listing.market_avg_revenue / 1000)}k market avg.${listing.ttm_revenue < listing.market_avg_revenue ? ` $${Math.round((listing.market_avg_revenue - listing.ttm_revenue) / 1000)}k below market.` : ' At or above market.'}`
                : listing.ttm_revenue ? `Earned $${Math.round(listing.ttm_revenue / 1000)}k last 12 months.` : 'Revenue data unavailable.',
            },
          ].map(item => (
            <div key={item.label} className="bg-[#12121A] rounded p-2.5 border border-[#2A2A3C]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[#9494A8] font-medium">{item.label}</span>
                {item.value !== null && item.value !== undefined && (
                  <span className={`font-mono font-bold ${item.value >= 65 ? 'text-green-400' : item.value >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>{item.value}</span>
                )}
              </div>
              <p className="text-[#9494A8] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* AI analysis */}
      {(listing.opportunity_notes || listing.outreach_angle) ? (
        <div className="grid grid-cols-1 gap-2 min-w-0">
          {listing.opportunity_notes && (
            <div className="bg-[#12121A] border border-[#2A2A3C] rounded p-2.5">
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
        <p className="text-[#5C5C72] italic">No AI analysis yet. Run &quot;Re-score All&quot; to generate insights.</p>
      )}
    </div>
  )
}
