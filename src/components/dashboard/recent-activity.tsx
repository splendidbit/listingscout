'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  BarChart3, 
  Upload, 
  Bot,
  CheckCircle2
} from 'lucide-react'

interface ActivityItem {
  id: string
  action: string
  entity_type: string
  entity_id: string
  details: Record<string, unknown>
  created_at: string
}

interface RecentActivityProps {
  activities: ActivityItem[]
  maxVisible?: number
}

export function RecentActivity({ activities, maxVisible = 10 }: RecentActivityProps) {
  const getActionIcon = (action: string) => {
    if (action.includes('created')) return Plus
    if (action.includes('updated')) return Edit2
    if (action.includes('deleted')) return Trash2
    if (action.includes('scored')) return BarChart3
    if (action.includes('import')) return Upload
    if (action.includes('ai') || action.includes('research')) return Bot
    return CheckCircle2
  }

  const getActionColor = (action: string) => {
    if (action.includes('created')) return 'bg-[#22C55E]/10 text-[#22C55E]'
    if (action.includes('deleted')) return 'bg-[#EF4444]/10 text-[#EF4444]'
    if (action.includes('scored')) return 'bg-[#6366F1]/10 text-[#6366F1]'
    if (action.includes('import')) return 'bg-[#F59E0B]/10 text-[#F59E0B]'
    return 'bg-[#9395a8]/10 text-[#c4c5d6]'
  }

  const formatAction = (action: string): string => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getDetailSummary = (activity: ActivityItem): string | null => {
    const { details } = activity
    
    if (details.name) return String(details.name)
    if (details.listing_title) return String(details.listing_title)
    if (details.scored !== undefined) return `${details.scored} listings`
    if (details.imported !== undefined) return `${details.imported} imported`
    
    return null
  }

  if (activities.length === 0) {
    return (
      <Card className="bg-[#13141c] border-[#363a4f]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-[#f0f0f6]">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8 text-[#c4c5d6]">
          No activity yet
        </CardContent>
      </Card>
    )
  }

  const visibleActivities = activities.slice(0, maxVisible)

  return (
    <Card className="bg-[#13141c] border-[#363a4f]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-[#f0f0f6]">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {visibleActivities.map((activity) => {
            const Icon = getActionIcon(activity.action)
            const colorClass = getActionColor(activity.action)
            const summary = getDetailSummary(activity)

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 bg-[#1c1d2b] rounded-lg"
              >
                <div className={`p-2 rounded-lg ${colorClass.split(' ')[0]}`}>
                  <Icon className={`h-4 w-4 ${colorClass.split(' ')[1]}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#f0f0f6] font-medium">
                      {formatAction(activity.action)}
                    </span>
                    <Badge variant="secondary" className="text-xs bg-[#363a4f] text-[#c4c5d6]">
                      {activity.entity_type}
                    </Badge>
                  </div>
                  {summary && (
                    <p className="text-xs text-[#c4c5d6] truncate mt-0.5">
                      {summary}
                    </p>
                  )}
                </div>
                <span className="text-xs text-[#9395a8] shrink-0">
                  {formatTimeAgo(activity.created_at)}
                </span>
              </div>
            )
          })}
        </div>

        {activities.length > maxVisible && (
          <p className="text-center text-xs text-[#c4c5d6] mt-4">
            Showing {maxVisible} of {activities.length} activities
          </p>
        )}
      </CardContent>
    </Card>
  )
}
