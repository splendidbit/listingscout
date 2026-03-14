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
    <header className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A3C] bg-[#0A0A0F]">
      <div>
        <h1 className="text-xl font-semibold text-[#F0F0F5]">{title}</h1>
        {description && (
          <p className="text-sm text-[#9494A8] mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#9494A8] hover:text-[#F0F0F5] hover:bg-[#1A1A26]"
        >
          <Bell className="h-5 w-5" />
        </Button>
        {action && (
          <Button
            asChild
            className="bg-[#6366F1] hover:bg-[#818CF8] text-white"
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
