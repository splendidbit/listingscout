'use client'

import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Search
} from 'lucide-react'

export type ResearchStatus = 
  | 'pending'
  | 'researching'
  | 'found'
  | 'not_found'
  | 'error'

interface ResearchStatusProps {
  status: ResearchStatus
  progress?: number
  message?: string
  compact?: boolean
}

export function ResearchStatusBadge({ status, progress, message, compact = false }: ResearchStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          icon: Clock,
          label: 'Pending',
          className: 'bg-[#5C5C72]/10 text-[#9494A8]',
        }
      case 'researching':
        return {
          icon: Loader2,
          label: 'Researching',
          className: 'bg-[#6366F1]/10 text-[#6366F1]',
          animate: true,
        }
      case 'found':
        return {
          icon: CheckCircle2,
          label: 'Owner Found',
          className: 'bg-[#22C55E]/10 text-[#22C55E]',
        }
      case 'not_found':
        return {
          icon: Search,
          label: 'Not Found',
          className: 'bg-[#F59E0B]/10 text-[#F59E0B]',
        }
      case 'error':
        return {
          icon: AlertCircle,
          label: 'Error',
          className: 'bg-[#EF4444]/10 text-[#EF4444]',
        }
      default:
        return {
          icon: Clock,
          label: 'Unknown',
          className: 'bg-[#5C5C72]/10 text-[#9494A8]',
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  if (compact) {
    return (
      <Badge className={`${config.className} border-0`}>
        <Icon className={`h-3 w-3 mr-1 ${config.animate ? 'animate-spin' : ''}`} />
        {config.label}
      </Badge>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${config.animate ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{config.label}</span>
      </div>
      {status === 'researching' && progress !== undefined && (
        <Progress value={progress} className="h-1" />
      )}
      {message && (
        <p className="text-xs text-[#9494A8]">{message}</p>
      )}
    </div>
  )
}
