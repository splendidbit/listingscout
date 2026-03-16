'use client'

import { cn } from '@/lib/utils'

interface ScoreBadgeProps {
  score: number | null
  tier?: 'strong' | 'moderate' | 'weak' | 'unscored' | 'excluded' | null
  size?: 'sm' | 'md' | 'lg'
  showTier?: boolean
}

export function ScoreBadge({ score, tier, size = 'md', showTier = false }: ScoreBadgeProps) {
  if (score === null) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-[#1D2030] text-[#7A7A90] font-mono',
          size === 'sm' && 'w-8 h-8 text-xs',
          size === 'md' && 'w-10 h-10 text-sm',
          size === 'lg' && 'w-14 h-14 text-lg'
        )}
      >
        —
      </div>
    )
  }

  const getTierColor = () => {
    switch (tier) {
      case 'strong':
        return {
          bg: 'bg-[#22C55E]',
          ring: 'ring-[#22C55E]/40',
          text: 'text-white',
        }
      case 'moderate':
        return {
          bg: 'bg-[#F59E0B]',
          ring: 'ring-[#F59E0B]/40',
          text: 'text-white',
        }
      case 'weak':
        return {
          bg: 'bg-[#EF4444]',
          ring: 'ring-[#EF4444]/40',
          text: 'text-white',
        }
      default:
        return {
          bg: 'bg-[#7A7A90]',
          ring: 'ring-[#7A7A90]/30',
          text: 'text-white',
        }
    }
  }

  const colors = getTierColor()

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'flex items-center justify-center rounded-full font-mono font-bold ring-2 shadow-lg',
          colors.bg,
          colors.ring,
          colors.text,
          size === 'sm' && 'w-8 h-8 text-xs',
          size === 'md' && 'w-10 h-10 text-sm',
          size === 'lg' && 'w-14 h-14 text-lg'
        )}
      >
        {score}
      </div>
      {showTier && tier && tier !== 'unscored' && tier !== 'excluded' && (
        <span className={cn(
          'text-[10px] uppercase tracking-wider font-semibold',
          tier === 'strong' && 'text-[#22C55E]',
          tier === 'moderate' && 'text-[#F59E0B]',
          tier === 'weak' && 'text-[#EF4444]'
        )}>
          {tier}
        </span>
      )}
    </div>
  )
}
