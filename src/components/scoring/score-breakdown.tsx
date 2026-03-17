'use client'

import { cn } from '@/lib/utils'

interface ScoreBreakdownProps {
  breakdown: {
    opportunity_score?: number
    occupancy_gap_score?: number
    revpan_gap_score?: number
    pricing_inefficiency_score?: number
    listing_quality_gap_score?: number
    momentum_score?: number
    host_profile_score?: number
    occupancy_delta?: number | null
    revpan_delta?: number | null
    adr_delta?: number | null
    momentum_signal?: number | null
    estimated_revenue_upside?: number | null
    estimated_upside_pct?: number | null
    lead_priority_rank?: string
    recommended_outreach_reason?: string
    // Market/listing data for actuals
    nightly_rate?: number | null
    ttm_avg_rate?: number | null
    ttm_occupancy?: number | null
    ttm_revenue?: number | null
    market_avg_price?: number | null
    market_avg_occupancy?: number | null
    market_avg_revenue?: number | null
    // Legacy fields (unused but kept for compat)
    location?: number
    property?: number
    performance?: number
    host?: number
    contact?: number
    deal?: number
  }
  showLabels?: boolean
}

function diagnosePrimaryIssue(b: ScoreBreakdownProps['breakdown']): {
  issue: string
  conclusion: string
} {
  const occDelta = b.occupancy_delta
  const adrDelta = b.adr_delta
  const revpanDelta = b.revpan_delta
  const momSignal = b.momentum_signal
  const qualityGap = b.listing_quality_gap_score ?? 0

  if (adrDelta !== null && adrDelta !== undefined && adrDelta > 0 && occDelta !== null && occDelta !== undefined && occDelta < -0.05) {
    return { issue: 'Overpricing', conclusion: 'High pricing is reducing booking volume and total revenue.' }
  }
  if (occDelta !== null && occDelta !== undefined && occDelta > 0.05 && revpanDelta !== null && revpanDelta !== undefined && revpanDelta < 0) {
    return { issue: 'Underpricing', conclusion: 'High occupancy but below-market revenue — the host could charge more.' }
  }
  if (momSignal !== null && momSignal !== undefined && momSignal < -0.15) {
    return { issue: 'Declining Performance', conclusion: 'Revenue has declined significantly compared to last year.' }
  }
  if (qualityGap > 60) {
    return { issue: 'Listing Quality Gaps', conclusion: 'Photos, amenities, or guest ratings are below competitive listings.' }
  }
  return { issue: 'Optimization Opportunity', conclusion: 'This listing has multiple small inefficiencies that compound into lower revenue.' }
}

function fmtPct(val: number, decimals = 0): string {
  return `${val >= 0 ? '+' : ''}${(val * 100).toFixed(decimals)}%`
}

function fmtMoney(val: number): string {
  if (Math.abs(val) >= 1000) return `$${(val / 1000).toFixed(1)}K`
  return `$${Math.round(val).toLocaleString()}`
}

const PRIORITY_BADGE: Record<string, { label: string; className: string }> = {
  hot: { label: 'HOT', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
  warm: { label: 'WARM', className: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  cold: { label: 'COLD', className: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  excluded: { label: 'EXCL', className: 'bg-gray-500/15 text-gray-400 border-gray-500/30' },
}

export function ScoreBreakdown({ breakdown, showLabels = true }: ScoreBreakdownProps) {
  const opportunityScore = breakdown.opportunity_score ?? 0
  const diagnosis = diagnosePrimaryIssue(breakdown)
  const priorityBadge = breakdown.lead_priority_rank ? PRIORITY_BADGE[breakdown.lead_priority_rank] : null

  // Build evidence bullets
  const evidence: string[] = []
  const listingAdr = breakdown.nightly_rate ?? breakdown.ttm_avg_rate
  const marketAdr = breakdown.market_avg_price

  if (breakdown.adr_delta !== null && breakdown.adr_delta !== undefined && listingAdr && marketAdr) {
    const pct = marketAdr !== 0 ? Math.round((breakdown.adr_delta / marketAdr) * 100) : 0
    const dir = breakdown.adr_delta > 0 ? 'above' : 'below'
    evidence.push(`ADR is ${Math.abs(pct)}% ${dir} market ($${Math.round(listingAdr)} vs $${Math.round(marketAdr)})`)
  }

  if (breakdown.occupancy_delta !== null && breakdown.occupancy_delta !== undefined) {
    const dir = breakdown.occupancy_delta > 0 ? 'above' : 'below'
    const listingPct = breakdown.ttm_occupancy !== null && breakdown.ttm_occupancy !== undefined ? `${Math.round(breakdown.ttm_occupancy * 100)}%` : '—'
    const marketPct = breakdown.market_avg_occupancy !== null && breakdown.market_avg_occupancy !== undefined ? `${Math.round(breakdown.market_avg_occupancy * 100)}%` : '—'
    evidence.push(`Occupancy is ${Math.abs(Math.round(breakdown.occupancy_delta * 100))}% ${dir} market (${listingPct} vs ${marketPct})`)
  }

  if (breakdown.revpan_delta !== null && breakdown.revpan_delta !== undefined) {
    const dir = breakdown.revpan_delta > 0 ? 'above' : 'below'
    const listingRevpar = listingAdr && breakdown.ttm_occupancy ? Math.round(listingAdr * breakdown.ttm_occupancy) : null
    const marketRevpar = marketAdr && breakdown.market_avg_occupancy ? Math.round(marketAdr * breakdown.market_avg_occupancy) : null
    const pct = marketRevpar ? Math.round((breakdown.revpan_delta / marketRevpar) * 100) : null
    const pctStr = pct !== null ? `${Math.abs(pct)}% ` : ''
    const vals = listingRevpar && marketRevpar ? ` ($${listingRevpar} vs $${marketRevpar})` : ''
    evidence.push(`RevPAR is ${pctStr}${dir} market${vals}`)
  }

  // Metrics table
  const listingOcc = breakdown.ttm_occupancy
  const marketOcc = breakdown.market_avg_occupancy
  const listingRevpar = listingAdr && listingOcc ? listingAdr * listingOcc : null
  const marketRevpar = marketAdr && marketOcc ? marketAdr * marketOcc : null

  type MetricRow = { label: string; listing: string; market: string; diff: string | null; diffNum: number | null; isBad: boolean }

  const metrics: MetricRow[] = [
    (() => {
      const diff = breakdown.adr_delta ?? (listingAdr && marketAdr ? listingAdr - marketAdr : null)
      const pct = marketAdr && diff !== null ? diff / marketAdr : null
      const isBad = diagnosis.issue === 'Overpricing' ? (diff !== null && diff > 0) : (diff !== null && diff < 0)
      return { label: 'ADR', listing: listingAdr ? `$${Math.round(listingAdr)}` : '—', market: marketAdr ? `$${Math.round(marketAdr)}` : '—', diff: pct !== null ? fmtPct(pct) : null, diffNum: pct, isBad }
    })(),
    (() => {
      const delta = breakdown.occupancy_delta
      const isBad = delta !== null && delta !== undefined && delta < 0
      return { label: 'Occupancy', listing: listingOcc !== null && listingOcc !== undefined ? `${Math.round(listingOcc * 100)}%` : '—', market: marketOcc !== null && marketOcc !== undefined ? `${Math.round(marketOcc * 100)}%` : '—', diff: delta !== null && delta !== undefined ? fmtPct(delta) : null, diffNum: delta ?? null, isBad }
    })(),
    (() => {
      const diff = breakdown.revpan_delta ?? (listingRevpar && marketRevpar ? listingRevpar - marketRevpar : null)
      const pct = marketRevpar && diff !== null ? diff / marketRevpar : null
      const isBad = diff !== null && diff < 0
      return { label: 'RevPAR', listing: listingRevpar !== null ? `$${Math.round(listingRevpar)}` : '—', market: marketRevpar !== null ? `$${Math.round(marketRevpar)}` : '—', diff: pct !== null ? fmtPct(pct) : null, diffNum: pct, isBad }
    })(),
    (() => {
      const listingRev = breakdown.ttm_revenue
      const marketRev = breakdown.market_avg_revenue
      const diff = listingRev && marketRev ? listingRev - marketRev : null
      const pct = marketRev && diff !== null ? diff / marketRev : null
      const isBad = diff !== null && diff < 0
      return { label: 'Annual Revenue', listing: listingRev ? fmtMoney(listingRev) : '—', market: marketRev ? fmtMoney(marketRev) : '—', diff: pct !== null ? fmtPct(pct) : null, diffNum: pct, isBad }
    })(),
  ]

  return (
    <div className="space-y-3">
      {/* Header: Score + Priority */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[#F0F0F5]">Opportunity Score</span>
          {priorityBadge && (
            <span className={cn('text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border', priorityBadge.className)}>
              {priorityBadge.label}
            </span>
          )}
        </div>
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

      {/* Primary Diagnosis */}
      <div className="bg-[#1A1A26] border border-[#2A2A3C] rounded p-2.5">
        <p className="text-[#F0F0F5] font-medium text-xs mb-1.5">
          🔍 {diagnosis.issue}
        </p>
        {evidence.length > 0 && (
          <div className="mb-1.5 space-y-0.5">
            {evidence.map((bullet, i) => (
              <p key={i} className="text-xs text-[#F0F0F5] leading-relaxed pl-2">• {bullet}</p>
            ))}
          </div>
        )}
        <p className="text-xs text-[#9494A8] italic">{diagnosis.conclusion}</p>
      </div>

      {/* Metrics Table */}
      {showLabels && (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[#9494A8] border-b border-[#2A2A3C]">
              <th className="text-left py-1 pr-2 font-medium">Metric</th>
              <th className="text-right py-1 px-1 font-medium">Listing</th>
              <th className="text-right py-1 px-1 font-medium">Market</th>
              <th className="text-right py-1 pl-1 font-medium">Diff</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(row => (
              <tr key={row.label} className="border-b border-[#2A2A3C]/50">
                <td className="py-1 pr-2 text-[#9494A8]">{row.label}</td>
                <td className="py-1 px-1 text-right font-mono text-[#F0F0F5]">{row.listing}</td>
                <td className="py-1 px-1 text-right font-mono text-[#9494A8]">{row.market}</td>
                <td className={cn(
                  'py-1 pl-1 text-right font-mono font-semibold',
                  row.diff === null ? 'text-[#5C5C72]' :
                  row.isBad ? 'text-red-400' :
                  row.diffNum !== null && row.diffNum !== 0 ? 'text-emerald-400' :
                  'text-[#9494A8]'
                )}>
                  {row.diff ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Revenue Upside */}
      {(breakdown.estimated_revenue_upside || breakdown.estimated_upside_pct) && (
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded p-2">
          <p className="text-emerald-400 font-medium text-xs">💰 Revenue Opportunity</p>
          <p className="text-[#F0F0F5] font-mono font-bold text-sm">
            {breakdown.estimated_revenue_upside && `+$${breakdown.estimated_revenue_upside.toLocaleString()}/yr`}
            {breakdown.estimated_upside_pct && ` (+${Math.round(breakdown.estimated_upside_pct * 100)}%)`}
          </p>
        </div>
      )}
    </div>
  )
}
