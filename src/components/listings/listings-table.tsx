'use client'

import { useState } from 'react'
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
  MapPin
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
}

interface ListingsTableProps {
  data: ListingRow[]
  onRowClick?: (listing: ListingRow) => void
}

export function ListingsTable({ data, onRowClick }: ListingsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [globalFilter, setGlobalFilter] = useState('')

  const columns: ColumnDef<ListingRow>[] = [
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
                <TableRow
                  key={row.id}
                  className="border-[#2A2A3C] hover:bg-[#1A1A26] cursor-pointer"
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
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
