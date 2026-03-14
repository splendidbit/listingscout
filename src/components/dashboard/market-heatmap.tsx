'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface MarketData {
  city: string
  state: string
  count: number
  strongCount: number
}

interface MarketHeatmapProps {
  markets: MarketData[]
  maxVisible?: number
}

export function MarketHeatmap({ markets, maxVisible = 8 }: MarketHeatmapProps) {
  const sortedMarkets = [...markets].sort((a, b) => b.count - a.count)
  const visibleMarkets = sortedMarkets.slice(0, maxVisible)
  const maxCount = Math.max(...markets.map(m => m.count), 1)

  const getHeatColor = (count: number): string => {
    const intensity = count / maxCount
    if (intensity > 0.75) return 'bg-[#6366F1]'
    if (intensity > 0.5) return 'bg-[#818CF8]'
    if (intensity > 0.25) return 'bg-[#A5B4FC]'
    return 'bg-[#C7D2FE]'
  }

  const getTextColor = (count: number): string => {
    const intensity = count / maxCount
    if (intensity > 0.5) return 'text-white'
    return 'text-[#1A1A26]'
  }

  if (markets.length === 0) {
    return (
      <Card className="bg-[#12121A] border-[#2A2A3C]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#F0F0F5]">Market Distribution</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-[#9494A8]">
          No market data yet
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#12121A] border-[#2A2A3C]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#F0F0F5]">Market Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {visibleMarkets.map((market) => (
            <div
              key={`${market.city}-${market.state}`}
              className={`p-3 rounded-lg ${getHeatColor(market.count)} transition-colors`}
            >
              <div className={`text-sm font-medium truncate ${getTextColor(market.count)}`}>
                {market.city}
              </div>
              <div className={`text-xs opacity-80 ${getTextColor(market.count)}`}>
                {market.state}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-lg font-bold ${getTextColor(market.count)}`}>
                  {market.count}
                </span>
                {market.strongCount > 0 && (
                  <Badge className="bg-[#22C55E]/20 text-[#22C55E] border-0 text-xs">
                    {market.strongCount} ★
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {sortedMarkets.length > maxVisible && (
          <p className="text-center text-xs text-[#9494A8] mt-4">
            + {sortedMarkets.length - maxVisible} more markets
          </p>
        )}

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#2A2A3C]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#C7D2FE]" />
            <span className="text-xs text-[#9494A8]">Low</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#818CF8]" />
            <span className="text-xs text-[#9494A8]">Medium</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-[#6366F1]" />
            <span className="text-xs text-[#9494A8]">High</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
