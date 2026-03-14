'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-[#2A2A3C]',
        className
      )}
      {...props}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-[#12121A] border border-[#2A2A3C] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <Skeleton className="h-8 w-24" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 5 }) {
  return (
    <div className="border border-[#2A2A3C] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-[#1A1A26] p-3 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="p-3 border-t border-[#2A2A3C] flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return (
    <div className="bg-[#12121A] border border-[#2A2A3C] rounded-lg p-4 space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="space-y-3">
        {[100, 80, 60, 40, 20].map((width, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-8 rounded-r-lg" style={{ width: `${width}%` }} />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function ListingSkeleton() {
  return (
    <div className="bg-[#12121A] border border-[#2A2A3C] rounded-lg p-4 flex items-center gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Chart */}
      <ChartSkeleton />

      {/* Table */}
      <TableSkeleton />
    </div>
  )
}
