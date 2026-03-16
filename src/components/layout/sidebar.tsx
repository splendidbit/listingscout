'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FolderKanban,
  Home,
  Target,
  Users,
  Download,
  Settings,
  HelpCircle,
  LogOut,
  ChevronUp,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns', href: '/campaigns', icon: FolderKanban },
  { name: 'All Listings', href: '/listings', icon: Home },
  { name: 'Leads', href: '/leads', icon: Target },
  { name: 'Owners', href: '/owners', icon: Users },
  { name: 'Exports', href: '/exports', icon: Download },
]

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/settings', icon: HelpCircle },
]

interface SidebarProps {
  user: {
    email: string
    full_name?: string | null
    avatar_url?: string | null
    subscription_tier?: string
  }
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/login')
    router.refresh()
  }

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : user.email[0].toUpperCase()

  return (
    <div className="flex h-full w-64 flex-col bg-[#13141c] border-r border-[#363a4f]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-[#363a4f]">
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="h-8 w-8 rounded-lg bg-[#6366F1] flex items-center justify-center">
            <Target className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#f0f0f6] tracking-tight">
            ListingScout
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center px-3 py-2.5 text-[15px] font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-[#6366F1]/15 text-[#818CF8]'
                  : 'text-[#c4c5d6] hover:bg-[#262838] hover:text-[#f0f0f6]'
              )}
            >
              <item.icon className="mr-3 h-[18px] w-[18px]" />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-4">
          <div className="border-t border-[#363a4f] pt-4">
            {secondaryNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2.5 text-[15px] font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-[#6366F1]/15 text-[#818CF8]'
                      : 'text-[#c4c5d6] hover:bg-[#262838] hover:text-[#f0f0f6]'
                  )}
                >
                  <item.icon className="mr-3 h-[18px] w-[18px]" />
                  {item.name}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* User section */}
      <div className="border-t border-[#363a4f] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center justify-between rounded-lg p-2.5 hover:bg-[#262838] transition-colors">
              <div className="flex items-center">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="bg-[#6366F1] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3 text-left">
                  <p className="text-sm font-medium text-[#f0f0f6] truncate max-w-[120px]">
                    {user.full_name || user.email}
                  </p>
                  <Badge
                    variant="secondary"
                    className="text-[10px] mt-0.5 bg-[#262838] text-[#c4c5d6] hover:bg-[#262838] border-0"
                  >
                    {user.subscription_tier || 'Free'}
                  </Badge>
                </div>
              </div>
              <ChevronUp className="h-4 w-4 text-[#9395a8]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#1c1d2b] border-[#363a4f]"
          >
            <DropdownMenuItem asChild>
              <Link
                href="/settings"
                className="text-[#f0f0f6] focus:bg-[#262838] focus:text-[#f0f0f6]"
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link
                href="/settings/billing"
                className="text-[#f0f0f6] focus:bg-[#262838] focus:text-[#f0f0f6]"
              >
                <span className="mr-2">💎</span>
                Upgrade Plan
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#363a4f]" />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-400 focus:bg-[#262838] focus:text-red-400"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
