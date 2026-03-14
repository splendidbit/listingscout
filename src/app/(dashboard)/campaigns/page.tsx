import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FolderKanban } from 'lucide-react'
import Link from 'next/link'

const statusColors = {
  draft: 'bg-[#5C5C72]/10 text-[#9494A8]',
  active: 'bg-[#22C55E]/10 text-[#22C55E]',
  paused: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  completed: 'bg-[#3B82F6]/10 text-[#3B82F6]',
  archived: 'bg-[#5C5C72]/10 text-[#5C5C72]',
}

export default async function CampaignsPage() {
  const supabase = await createClient()

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .order('updated_at', { ascending: false })

  // Type assertion for when Supabase isn't configured yet
  const campaignList = campaigns as Array<{
    id: string
    name: string
    description: string | null
    status: string
    total_listings: number
    strong_leads: number
    moderate_leads: number
    weak_leads: number
    updated_at: string
  }> | null

  return (
    <div className="min-h-screen">
      <Header
        title="Campaigns"
        description="Manage your listing research campaigns"
        action={{ label: 'New Campaign', href: '/campaigns/new' }}
      />

      <div className="p-6">
        {campaignList && campaignList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaignList.map((campaign) => (
              <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
                <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium text-[#F0F0F5]">
                        {campaign.name}
                      </CardTitle>
                      <Badge
                        variant="secondary"
                        className={
                          statusColors[
                            campaign.status as keyof typeof statusColors
                          ]
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaign.description && (
                      <p className="text-sm text-[#9494A8] mb-4 line-clamp-2">
                        {campaign.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-[#9494A8]">
                          <span className="font-mono text-[#F0F0F5]">
                            {campaign.total_listings || 0}
                          </span>{' '}
                          listings
                        </span>
                        <span className="text-[#22C55E]">
                          <span className="font-mono">
                            {campaign.strong_leads || 0}
                          </span>{' '}
                          leads
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 bg-[#1A1A26] rounded-full overflow-hidden">
                      <div className="h-full flex">
                        <div
                          className="bg-[#22C55E]"
                          style={{
                            width: `${campaign.total_listings ? (campaign.strong_leads / campaign.total_listings) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-[#F59E0B]"
                          style={{
                            width: `${campaign.total_listings ? (campaign.moderate_leads / campaign.total_listings) * 100 : 0}%`,
                          }}
                        />
                        <div
                          className="bg-[#EF4444]"
                          style={{
                            width: `${campaign.total_listings ? (campaign.weak_leads / campaign.total_listings) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[#5C5C72] mt-3">
                      Updated{' '}
                      {new Date(campaign.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-[#12121A] border-[#2A2A3C]">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderKanban className="h-12 w-12 text-[#5C5C72] mb-4" />
              <h3 className="text-lg font-medium text-[#F0F0F5] mb-2">
                No campaigns yet
              </h3>
              <p className="text-sm text-[#9494A8] mb-4">
                Create your first campaign to start researching listings
              </p>
              <Link
                href="/campaigns/new"
                className="inline-flex items-center px-4 py-2 bg-[#6366F1] hover:bg-[#818CF8] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Create Campaign
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
