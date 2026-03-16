'use client'

import { Button } from '@/components/ui/button'
import { Plus, Bell } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  title: string
  description?: string
  action?: {
    label: string
    href: string
  }
}

export function Header({ title, description, action }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-[#2A2D42] bg-[#0F1117]">
      <div>
        <h1 className="text-2xl font-bold text-[#EEEEF4] tracking-tight">{title}</h1>
        {description && (
          <p className="text-sm text-[#B0B0C0] mt-1">{description}</p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#B0B0C0] hover:text-[#EEEEF4] hover:bg-[#1D2030]"
        >
          <Bell className="h-5 w-5" />
        </Button>
        {action && (
          <Button
            asChild
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white font-medium"
          >
            <Link href={action.href}>
              <Plus className="mr-2 h-4 w-4" />
              {action.label}
            </Link>
          </Button>
        )}
      </div>
    </header>
  )
}
