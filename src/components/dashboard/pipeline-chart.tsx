'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface PipelineData {
  total: number
  scored: number
  strong: number
  moderate: number
  weak: number
}

interface PipelineChartProps {
  data: PipelineData
}

export function PipelineChart({ data }: PipelineChartProps) {
  const stages = useMemo(() => {
    const maxWidth = 100
    const baseWidth = 20
    
    // Calculate percentages relative to total
    const scoredPct = data.total > 0 ? (data.scored / data.total) * 100 : 0
    const strongPct = data.total > 0 ? (data.strong / data.total) * 100 : 0
    const moderatePct = data.total > 0 ? (data.moderate / data.total) * 100 : 0
    const weakPct = data.total > 0 ? (data.weak / data.total) * 100 : 0
    
    return [
      {
        label: 'Total',
        value: data.total,
        width: maxWidth,
        color: 'bg-[#6366F1]',
        textColor: 'text-[#6366F1]',
      },
      {
        label: 'Scored',
        value: data.scored,
        width: Math.max(baseWidth, (scoredPct / 100) * maxWidth),
        color: 'bg-[#8B5CF6]',
        textColor: 'text-[#8B5CF6]',
      },
      {
        label: 'Strong',
        value: data.strong,
        width: Math.max(baseWidth, (strongPct / 100) * maxWidth),
        color: 'bg-[#22C55E]',
        textColor: 'text-[#22C55E]',
      },
      {
        label: 'Moderate',
        value: data.moderate,
        width: Math.max(baseWidth, (moderatePct / 100) * maxWidth),
        color: 'bg-[#F59E0B]',
        textColor: 'text-[#F59E0B]',
      },
      {
        label: 'Weak',
        value: data.weak,
        width: Math.max(baseWidth, (weakPct / 100) * maxWidth),
        color: 'bg-[#EF4444]',
        textColor: 'text-[#EF4444]',
      },
    ]
  }, [data])

  return (
    <Card className="bg-[#13141c] border-[#363a4f]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#f0f0f6]">Lead Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stages.map((stage, index) => (
            <div key={stage.label} className="relative">
              {/* Connector line */}
              {index > 0 && (
                <div className="absolute -top-3 left-4 w-0.5 h-3 bg-[#363a4f]" />
              )}
              
              {/* Stage bar */}
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 rounded-r-lg ${stage.color} flex items-center justify-end pr-3 transition-all duration-500`}
                  style={{ width: `${stage.width}%` }}
                >
                  <span className="text-white font-bold text-sm">
                    {stage.value}
                  </span>
                </div>
                <span className={`text-sm font-medium ${stage.textColor}`}>
                  {stage.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Conversion rates */}
        {data.total > 0 && (
          <div className="mt-6 pt-4 border-t border-[#363a4f] grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-[#c4c5d6]">Score Rate</p>
              <p className="text-lg font-bold text-[#f0f0f6]">
                {Math.round((data.scored / data.total) * 100)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#c4c5d6]">Strong Rate</p>
              <p className="text-lg font-bold text-[#22C55E]">
                {data.scored > 0 ? Math.round((data.strong / data.scored) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#c4c5d6]">Weak Rate</p>
              <p className="text-lg font-bold text-[#EF4444]">
                {data.scored > 0 ? Math.round((data.weak / data.scored) * 100) : 0}%
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
