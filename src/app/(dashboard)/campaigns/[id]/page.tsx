import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Home, 
  Star, 
  TrendingUp, 
  Users, 
  AlertCircle,
  BarChart3,
  FileDown,
  Bot,
  Settings,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CampaignCriteria } from '@/lib/types/criteria'
import { Database } from '@/types/database'

type CampaignDbRow = Database['public']['Tables']['campaigns']['Row']
type ListingDbRow = Database['public']['Tables']['listings']['Row']

interface CampaignPageProps {
  params: Promise<{ id: string }>
}

const statusColors = {
  draft: 'bg-[#5C5C72]/10 text-[#9494A8]',
  active: 'bg-[#22C55E]/10 text-[#22C55E]',
  paused: 'bg-[#F59E0B]/10 text-[#F59E0B]',
  completed: 'bg-[#3B82F6]/10 text-[#3B82F6]',
  archived: 'bg-[#5C5C72]/10 text-[#5C5C72]',
}

export default async function CampaignDetailPage({ params }: CampaignPageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: campaignData, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !campaignData) {
    notFound()
  }

  const campaign = campaignData as CampaignDbRow
  const criteria = campaign.criteria as unknown as CampaignCriteria

  // Get recent listings
  const { data: recentListingsData } = await supabase
    .from('listings')
    .select('*')
    .eq('campaign_id', id)
    .order('created_at', { ascending: false })
    .limit(5)
  
  const recentListings = (recentListingsData || []) as ListingDbRow[]

  const stats = [
    {
      label: 'Total Listings',
      value: campaign.total_listings || 0,
      icon: Home,
      color: 'text-[#6366F1]',
      bgColor: 'bg-[#6366F1]/10',
    },
    {
      label: 'Strong Leads',
      value: campaign.strong_leads || 0,
      icon: Star,
      color: 'text-[#22C55E]',
      bgColor: 'bg-[#22C55E]/10',
    },
    {
      label: 'Moderate Leads',
      value: campaign.moderate_leads || 0,
      icon: TrendingUp,
      color: 'text-[#F59E0B]',
      bgColor: 'bg-[#F59E0B]/10',
    },
    {
      label: 'Weak Leads',
      value: campaign.weak_leads || 0,
      icon: AlertCircle,
      color: 'text-[#EF4444]',
      bgColor: 'bg-[#EF4444]/10',
    },
    {
      label: 'Owners Found',
      value: campaign.owners_found || 0,
      icon: Users,
      color: 'text-[#8B5CF6]',
      bgColor: 'bg-[#8B5CF6]/10',
    },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title={campaign.name}
        description={campaign.description || 'Campaign overview'}
      />

      <div className="p-6 space-y-6">
        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <Badge
            variant="secondary"
            className={statusColors[campaign.status as keyof typeof statusColors]}
          >
            {campaign.status}
          </Badge>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/campaigns/${id}/settings`}>
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Link>
            </Button>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button size="sm" className="bg-[#6366F1] hover:bg-[#818CF8]">
              <Bot className="h-4 w-4 mr-2" />
              Research with AI
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-[#12121A] border-[#2A2A3C]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#9494A8]">{stat.label}</p>
                      <p className="text-2xl font-bold text-[#F0F0F5] font-mono">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <Icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Pipeline Progress */}
        <Card className="bg-[#12121A] border-[#2A2A3C]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#F0F0F5] flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Lead Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-[#1A1A26] rounded-full overflow-hidden flex">
              {campaign.total_listings > 0 ? (
                <>
                  <div
                    className="bg-[#22C55E] transition-all"
                    style={{
                      width: `${(campaign.strong_leads / campaign.total_listings) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-[#F59E0B] transition-all"
                    style={{
                      width: `${(campaign.moderate_leads / campaign.total_listings) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-[#EF4444] transition-all"
                    style={{
                      width: `${(campaign.weak_leads / campaign.total_listings) * 100}%`,
                    }}
                  />
                  <div
                    className="bg-[#5C5C72] transition-all"
                    style={{
                      width: `${((campaign.total_listings - campaign.strong_leads - campaign.moderate_leads - campaign.weak_leads) / campaign.total_listings) * 100}%`,
                    }}
                  />
                </>
              ) : (
                <div className="w-full bg-[#2A2A3C]" />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-[#9494A8]">
              <span>Strong: {campaign.strong_leads}</span>
              <span>Moderate: {campaign.moderate_leads}</span>
              <span>Weak: {campaign.weak_leads}</span>
              <span>Unscored: {campaign.total_listings - campaign.strong_leads - campaign.moderate_leads - campaign.weak_leads}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href={`/campaigns/${id}/listings`}>
            <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#6366F1]/10">
                    <Home className="h-5 w-5 text-[#6366F1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#F0F0F5]">All Listings</p>
                    <p className="text-sm text-[#9494A8]">{campaign.total_listings} total</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5C5C72]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/leads`}>
            <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#22C55E]/10">
                    <Star className="h-5 w-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#F0F0F5]">Strong Leads</p>
                    <p className="text-sm text-[#9494A8]">{campaign.strong_leads} ready</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5C5C72]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/weak`}>
            <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#EF4444]/10">
                    <AlertCircle className="h-5 w-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#F0F0F5]">Weak Leads</p>
                    <p className="text-sm text-[#9494A8]">{campaign.weak_leads} filtered</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5C5C72]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/settings`}>
            <Card className="bg-[#12121A] border-[#2A2A3C] hover:border-[#3A3A52] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#8B5CF6]/10">
                    <Settings className="h-5 w-5 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#F0F0F5]">Settings</p>
                    <p className="text-sm text-[#9494A8]">Criteria & integrations</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#5C5C72]" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Listings & Criteria Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings */}
          <Card className="bg-[#12121A] border-[#2A2A3C]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#F0F0F5]">Recent Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentListings && recentListings.length > 0 ? (
                <div className="space-y-3">
                  {recentListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-3 bg-[#1A1A26] rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#F0F0F5] truncate">
                          {listing.listing_title}
                        </p>
                        <p className="text-xs text-[#9494A8]">
                          {listing.city}, {listing.state}
                        </p>
                      </div>
                      {listing.lead_score !== null && (
                        <div
                          className={`ml-3 px-2 py-1 rounded text-xs font-mono ${
                            listing.lead_tier === 'strong'
                              ? 'bg-[#22C55E]/10 text-[#22C55E]'
                              : listing.lead_tier === 'moderate'
                              ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                              : listing.lead_tier === 'weak'
                              ? 'bg-[#EF4444]/10 text-[#EF4444]'
                              : 'bg-[#5C5C72]/10 text-[#5C5C72]'
                          }`}
                        >
                          {listing.lead_score}
                        </div>
                      )}
                    </div>
                  ))}
                  <Link
                    href={`/campaigns/${id}/listings`}
                    className="block text-center text-sm text-[#6366F1] hover:text-[#818CF8] mt-2"
                  >
                    View all listings →
                  </Link>
                </div>
              ) : (
                <div className="text-center py-8 text-[#9494A8]">
                  <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No listings yet</p>
                  <p className="text-xs mt-1">Import listings or use AI research</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Criteria Summary */}
          <Card className="bg-[#12121A] border-[#2A2A3C]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#F0F0F5]">Criteria Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#9494A8] mb-1">Target Markets</p>
                <div className="flex flex-wrap gap-1">
                  {criteria?.location?.target_markets?.length > 0 ? (
                    criteria.location.target_markets.map((m) => (
                      <Badge key={m} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1] text-xs">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-[#5C5C72]">Not specified</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#9494A8]">Min Beds</p>
                  <p className="font-mono text-[#F0F0F5]">{criteria?.property?.min_bedrooms || 0}+</p>
                </div>
                <div>
                  <p className="text-xs text-[#9494A8]">Min Rating</p>
                  <p className="font-mono text-[#F0F0F5]">{criteria?.performance?.min_rating || 0}+</p>
                </div>
                <div>
                  <p className="text-xs text-[#9494A8]">Rate Range</p>
                  <p className="font-mono text-[#F0F0F5]">
                    ${criteria?.performance?.nightly_rate_min || 0}-${criteria?.performance?.nightly_rate_max || 0}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#9494A8] mb-2">Scoring Weights</p>
                <div className="grid grid-cols-6 gap-1">
                  {criteria?.scoring_weights && Object.entries(criteria.scoring_weights).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="h-12 bg-[#1A1A26] rounded flex items-end justify-center overflow-hidden">
                        <div
                          className="w-full bg-[#6366F1] transition-all"
                          style={{ height: `${(value as number) * 2}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#9494A8] mt-1 capitalize">{key}</p>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/campaigns/${id}/settings`}
                className="block text-center text-sm text-[#6366F1] hover:text-[#818CF8] mt-2"
              >
                Edit criteria →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
