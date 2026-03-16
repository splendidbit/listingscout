import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Settings, Palette, Bell, Key } from 'lucide-react'
import Link from 'next/link'

const settingsLinks = [
  {
    title: 'Criteria Templates',
    description: 'Manage default scoring criteria templates',
    href: '/settings/criteria',
    icon: Palette,
  },
  {
    title: 'Integrations',
    description: 'Connect Google Sheets and other services',
    href: '/settings/integrations',
    icon: Key,
  },
  {
    title: 'Billing',
    description: 'Manage your subscription and usage',
    href: '/settings/billing',
    icon: Settings,
  },
]

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <Header title="Settings" description="Manage your account and preferences" />

      <div className="p-6 max-w-4xl">
        <div className="grid gap-4">
          {settingsLinks.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="bg-[#13141c] border-[#363a4f] hover:border-[#4a4d65] transition-colors cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <div className="p-3 rounded-lg bg-[#1c1d2b] mr-4">
                    <item.icon className="h-6 w-6 text-[#6366F1]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#f0f0f6]">{item.title}</h3>
                    <p className="text-sm text-[#c4c5d6]">{item.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
