'use client'

import { cn } from '@/lib/utils'

interface ScoreBreakdownProps {
  breakdown: {
    location: number
    property: number
    performance: number
    host: number
    contact: number
    deal: number
  }
  showLabels?: boolean
}

const CATEGORIES = [
  { key: 'location', label: 'Location', color: 'bg-[#6366F1]' },
  { key: 'property', label: 'Property', color: 'bg-[#8B5CF6]' },
  { key: 'performance', label: 'Performance', color: 'bg-[#A855F7]' },
  { key: 'host', label: 'Host', color: 'bg-[#D946EF]' },
  { key: 'contact', label: 'Contact', color: 'bg-[#EC4899]' },
  { key: 'deal', label: 'Deal', color: 'bg-[#F43F5E]' },
] as const

export function ScoreBreakdown({ breakdown, showLabels = true }: ScoreBreakdownProps) {
  const total = Object.values(breakdown).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-3">
      {/* Stacked Bar */}
      <div className="h-3 rounded-full overflow-hidden flex bg-[#2A2A3C]">
        {CATEGORIES.map(({ key, color }) => {
          const value = breakdown[key]
          if (value === 0) return null
          return (
            <div
              key={key}
              className={cn('transition-all', color)}
              style={{ width: `${(value / 100) * 100}%` }}
            />
          )
        })}
      </div>

      {/* Legend */}
      {showLabels && (
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(({ key, label, color }) => (
            <div key={key} className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full shrink-0', color)} />
              <span className="text-xs text-[#9494A8] truncate">{label}</span>
              <span className="text-xs font-mono text-[#F0F0F5] ml-auto">
                {breakdown[key]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-[#2A2A3C]">
        <span className="text-sm font-medium text-[#F0F0F5]">Total Score</span>
        <span className="text-lg font-mono font-bold text-[#F0F0F5]">{total}</span>
      </div>
    </div>
  )
}
