import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
              <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer">
                <CardContent className="flex items-center p-6">
                  <div className="p-3 rounded-lg bg-[#1A1A26] mr-4">
                    <item.icon className="h-6 w-6 text-[#6366F1]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-[#F0F0F5]">{item.title}</h3>
                    <p className="text-sm text-[#9494A8]">{item.description}</p>
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
