import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Target, Users, FolderKanban, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Fetch campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5)

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
    owners_found: number
    updated_at: string
  }> | null

  // Calculate totals
  const totalListings =
    campaignList?.reduce((sum, c) => sum + (c.total_listings || 0), 0) || 0
  const strongLeads =
    campaignList?.reduce((sum, c) => sum + (c.strong_leads || 0), 0) || 0
  const ownersFound =
    campaignList?.reduce((sum, c) => sum + (c.owners_found || 0), 0) || 0
  const activeCampaigns = campaignList?.length || 0

  const stats = [
    {
      name: 'Total Listings',
      value: totalListings.toLocaleString(),
      icon: Home,
      change: '+12%',
      trend: 'up',
    },
    {
      name: 'Strong Leads',
      value: strongLeads.toLocaleString(),
      icon: Target,
      change: '+8%',
      trend: 'up',
      color: 'text-[#22C55E]',
    },
    {
      name: 'Owners Found',
      value: ownersFound.toLocaleString(),
      icon: Users,
      change: `${totalListings > 0 ? Math.round((ownersFound / totalListings) * 100) : 0}%`,
      trend: 'neutral',
    },
    {
      name: 'Active Campaigns',
      value: activeCampaigns.toString(),
      icon: FolderKanban,
      change: '',
      trend: 'neutral',
    },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        description="Overview of your listing research"
        action={{ label: 'New Campaign', href: '/campaigns/new' }}
      />

      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card
              key={stat.name}
              className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors"
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg bg-[#1A1A26] ${stat.color || 'text-[#6366F1]'}`}
                  >
                    <stat.icon className="h-5 w-5" />
                  </div>
                  {stat.change && (
                    <div
                      className={`flex items-center text-sm ${
                        stat.trend === 'up'
                          ? 'text-[#22C55E]'
                          : stat.trend === 'down'
                            ? 'text-[#EF4444]'
                            : 'text-[#9494A8]'
                      }`}
                    >
                      {stat.trend === 'up' && (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      )}
                      {stat.trend === 'down' && (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {stat.change}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold text-[#F0F0F5] font-mono">
                    {stat.value}
                  </p>
                  <p className="text-sm text-[#9494A8] mt-1">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Campaigns Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#F0F0F5]">
              Active Campaigns
            </h2>
            <Link
              href="/campaigns"
              className="text-sm text-[#6366F1] hover:text-[#818CF8]"
            >
              View all
            </Link>
          </div>

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
                          className="bg-[#22C55E]/10 text-[#22C55E] hover:bg-[#22C55E]/20"
                        >
                          Active
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
                      {/* Mini progress bar */}
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
    </div>
  )
}
