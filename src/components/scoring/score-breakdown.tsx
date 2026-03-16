'use client'

import { cn } from '@/lib/utils'

interface ScoreBreakdownProps {
  breakdown: {
    // New opportunity scoring fields
    opportunity_score?: number
    occupancy_gap_score?: number
    revpan_gap_score?: number
    pricing_inefficiency_score?: number
    listing_quality_gap_score?: number
    momentum_score?: number
    host_profile_score?: number
    // Deltas
    occupancy_delta?: number | null
    revpan_delta?: number | null
    adr_delta?: number | null
    momentum_signal?: number | null
    // Revenue upside
    estimated_revenue_upside?: number | null
    estimated_upside_pct?: number | null
    // Lead info
    lead_priority_rank?: string
    recommended_outreach_reason?: string
    // Legacy fields
    location?: number
    property?: number
    performance?: number
    host?: number
    contact?: number
    deal?: number
  }
  showLabels?: boolean
}

const CATEGORIES = [
  { key: 'occupancy_gap_score', label: 'Occupancy Gap', color: 'bg-[#6366F1]' },
  { key: 'revpan_gap_score', label: 'RevPAR Gap', color: 'bg-[#8B5CF6]' },
  { key: 'pricing_inefficiency_score', label: 'Pricing', color: 'bg-[#A855F7]' },
  { key: 'listing_quality_gap_score', label: 'Quality Gap', color: 'bg-[#D946EF]' },
  { key: 'momentum_score', label: 'Momentum', color: 'bg-[#EC4899]' },
  { key: 'host_profile_score', label: 'Host Profile', color: 'bg-[#F43F5E]' },
] as const

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  hot: { bg: 'bg-red-500/15', text: 'text-red-400' },
  warm: { bg: 'bg-orange-500/15', text: 'text-orange-400' },
  cold: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  excluded: { bg: 'bg-gray-500/15', text: 'text-gray-400' },
}

function formatDelta(value: number | null | undefined, suffix: string, invert = false): string | null {
  if (value === null || value === undefined) return null
  const sign = invert ? (value > 0 ? '-' : '+') : (value >= 0 ? '+' : '')
  return `${sign}${Math.abs(value).toFixed(1)}${suffix}`
}

export function ScoreBreakdown({ breakdown, showLabels = true }: ScoreBreakdownProps) {
  const hasNewScoring = breakdown.opportunity_score !== undefined
  const opportunityScore = breakdown.opportunity_score ?? 0

  return (
    <div className="space-y-3">
      {/* Opportunity Score Header */}
      {hasNewScoring && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[#f0f0f6]">Opportunity Score</span>
          <span className={cn(
            'text-2xl font-mono font-bold',
            opportunityScore >= 70 ? 'text-red-400' :
            opportunityScore >= 50 ? 'text-orange-400' :
            opportunityScore >= 30 ? 'text-yellow-400' :
            'text-green-400'
          )}>
            {opportunityScore}
          </span>
        </div>
      )}

      {/* Lead Priority Badge */}
      {breakdown.lead_priority_rank && (
        <div className="flex items-center gap-2">
          <span className={cn(
            'text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded',
            PRIORITY_COLORS[breakdown.lead_priority_rank]?.bg ?? 'bg-gray-500/15',
            PRIORITY_COLORS[breakdown.lead_priority_rank]?.text ?? 'text-gray-400',
          )}>
            {breakdown.lead_priority_rank}
          </span>
        </div>
      )}

      {/* Outreach Reason Callout */}
      {breakdown.recommended_outreach_reason && (
        <div className="bg-[#6366F1]/10 border border-[#6366F1]/20 rounded p-2.5">
          <p className="text-sm text-[#6366F1] font-medium mb-0.5">Outreach Signal</p>
          <p className="text-sm text-[#f0f0f6] leading-relaxed">{breakdown.recommended_outreach_reason}</p>
        </div>
      )}

      {/* Component Score Bars */}
      <div className="h-3 rounded-full overflow-hidden flex bg-[#363a4f]">
        {CATEGORIES.map(({ key, color }) => {
          const value = (breakdown as Record<string, unknown>)[key] as number | undefined
          if (!value || value === 0) return null
          return (
            <div
              key={key}
              className={cn('transition-all', color)}
              style={{ width: `${(value / 100) * 100}%` }}
            />
          )
        })}
      </div>

      {/* Legend with scores */}
      {showLabels && (
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map(({ key, label, color }) => {
            const value = (breakdown as Record<string, unknown>)[key] as number | undefined
            return (
              <div key={key} className="flex items-center gap-2">
                <div className={cn('w-2 h-2 rounded-full shrink-0', color)} />
                <span className="text-sm text-[#c4c5d6] truncate">{label}</span>
                <span className="text-sm font-mono text-[#f0f0f6] ml-auto">
                  {value ?? '—'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Market Deltas */}
      {hasNewScoring && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#363a4f]">
          {[
            { label: 'Occ. vs Market', value: formatDelta(breakdown.occupancy_delta !== undefined ? (breakdown.occupancy_delta !== null ? breakdown.occupancy_delta * 100 : null) : null, '%') },
            { label: 'RevPAR vs Mkt', value: breakdown.revpan_delta !== null && breakdown.revpan_delta !== undefined ? `$${Math.round(breakdown.revpan_delta)}` : null },
            { label: 'Momentum', value: breakdown.momentum_signal !== null && breakdown.momentum_signal !== undefined ? `${breakdown.momentum_signal > 0 ? '+' : ''}${Math.round(breakdown.momentum_signal * 100)}%` : null },
            { label: 'Est. Upside', value: breakdown.estimated_revenue_upside ? `$${breakdown.estimated_revenue_upside.toLocaleString()}` : null },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm text-[#c4c5d6]">{item.label}</span>
              <span className={cn(
                'text-sm font-mono',
                item.value ? 'text-[#f0f0f6]' : 'text-[#9395a8]'
              )}>
                {item.value ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-[#363a4f]">
        <span className="text-sm font-medium text-[#f0f0f6]">
          {hasNewScoring ? 'Opportunity Score' : 'Total Score'}
        </span>
        <span className="text-lg font-mono font-bold text-[#f0f0f6]">
          {hasNewScoring ? opportunityScore : Object.values(breakdown).reduce<number>((a, b) => a + (typeof b === 'number' ? b : 0), 0)}
        </span>
      </div>
    </div>
  )
}
