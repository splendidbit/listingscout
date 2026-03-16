'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ScoreActionsProps {
  campaignId: string
  unscoredCount: number
  totalCount: number
}

export function ScoreActions({ campaignId, unscoredCount, totalCount }: ScoreActionsProps) {
  const router = useRouter()
  const [isScoring, setIsScoring] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleScore = async (rescore: boolean = false) => {
    setIsScoring(true)
    setProgress(0)

    try {
      const response = await fetch('/api/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          rescore,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Scoring failed')
      }

      toast.success(`Scored ${result.scored} listings`)
      setProgress(100)
      
      // Refresh the page to show new scores
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Scoring failed')
    } finally {
      setTimeout(() => {
        setIsScoring(false)
        setProgress(0)
      }, 500)
    }
  }

  if (isScoring) {
    return (
      <div className="flex items-center gap-3">
        <Loader2 className="h-4 w-4 animate-spin text-[#6366F1]" />
        <span className="text-sm text-[#B0B0C0]">Scoring listings...</span>
        {progress > 0 && (
          <Progress value={progress} className="w-24 h-2" />
        )}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {unscoredCount > 0 && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handleScore(false)}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Score {unscoredCount} Unscored
        </Button>
      )}
      {totalCount > 0 && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleScore(true)}
          className="text-[#B0B0C0]"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Re-score All
        </Button>
      )}
    </div>
  )
}
