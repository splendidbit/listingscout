'use client'

import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-full bg-[#1A1A26] flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-[#5C5C72]" />
      </div>
      <h3 className="text-lg font-medium text-[#F0F0F5] mb-2">{title}</h3>
      <p className="text-sm text-[#9494A8] text-center max-w-md mb-6">
        {description}
      </p>
      {actionLabel && (
        <>
          {actionHref ? (
            <Button asChild className="bg-[#6366F1] hover:bg-[#818CF8]">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
          ) : onAction ? (
            <Button onClick={onAction} className="bg-[#6366F1] hover:bg-[#818CF8]">
              {actionLabel}
            </Button>
          ) : null}
        </>
      )}
    </div>
  )
}
