import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Home, 
  Star, 
  TrendingUp, 
  Users, 
  AlertCircle,
  BarChart3,
  ArrowRight,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CampaignCriteria } from '@/lib/types/criteria'
import { Database } from '@/types/database'
import { CampaignActions } from '@/components/campaigns/campaign-actions'
import { STATUS_COLORS, LEAD_TIER_COLORS } from '@/lib/campaigns/constants'

type CampaignDbRow = Database['public']['Tables']['campaigns']['Row']
type ListingDbRow = Database['public']['Tables']['listings']['Row']

interface CampaignPageProps {
  params: Promise<{ id: string }>
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
            className={STATUS_COLORS[campaign.status] ?? STATUS_COLORS.draft}
          >
            {campaign.status}
          </Badge>
          <CampaignActions campaignId={id} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-[#13141c] border-[#363a4f]">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#c4c5d6]">{stat.label}</p>
                      <p className="text-2xl font-bold text-[#f0f0f6] font-mono">
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
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[#f0f0f6] flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Lead Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-[#1c1d2b] rounded-full overflow-hidden flex">
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
                    className="bg-[#9395a8] transition-all"
                    style={{
                      width: `${(Math.max(0, campaign.total_listings - campaign.strong_leads - campaign.moderate_leads - campaign.weak_leads) / campaign.total_listings) * 100}%`,
                    }}
                  />
                </>
              ) : (
                <div className="w-full bg-[#363a4f]" />
              )}
            </div>
            <div className="flex items-center justify-between mt-2 text-xs text-[#c4c5d6]">
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
            <Card className="bg-[#13141c] border-[#363a4f] hover:border-[#4a4d65] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#6366F1]/10">
                    <Home className="h-5 w-5 text-[#6366F1]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#f0f0f6]">All Listings</p>
                    <p className="text-sm text-[#c4c5d6]">{campaign.total_listings} total</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#9395a8]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/leads`}>
            <Card className="bg-[#13141c] border-[#363a4f] hover:border-[#4a4d65] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#22C55E]/10">
                    <Star className="h-5 w-5 text-[#22C55E]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#f0f0f6]">Strong Leads</p>
                    <p className="text-sm text-[#c4c5d6]">{campaign.strong_leads} ready</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#9395a8]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/weak`}>
            <Card className="bg-[#13141c] border-[#363a4f] hover:border-[#4a4d65] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#EF4444]/10">
                    <AlertCircle className="h-5 w-5 text-[#EF4444]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#f0f0f6]">Weak Leads</p>
                    <p className="text-sm text-[#c4c5d6]">{campaign.weak_leads} filtered</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#9395a8]" />
              </CardContent>
            </Card>
          </Link>

          <Link href={`/campaigns/${id}/settings`}>
            <Card className="bg-[#13141c] border-[#363a4f] hover:border-[#4a4d65] transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#8B5CF6]/10">
                    <Settings className="h-5 w-5 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="font-medium text-[#f0f0f6]">Settings</p>
                    <p className="text-sm text-[#c4c5d6]">Criteria & integrations</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-[#9395a8]" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Listings & Criteria Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings */}
          <Card className="bg-[#13141c] border-[#363a4f]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#f0f0f6]">Recent Listings</CardTitle>
            </CardHeader>
            <CardContent>
              {recentListings && recentListings.length > 0 ? (
                <div className="space-y-3">
                  {recentListings.map((listing) => (
                    <div
                      key={listing.id}
                      className="flex items-center justify-between p-3 bg-[#1c1d2b] rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f0f0f6] truncate">
                          {listing.listing_title}
                        </p>
                        <p className="text-xs text-[#c4c5d6]">
                          {listing.city}, {listing.state}
                        </p>
                      </div>
                      {listing.lead_score !== null && (
                        <div className={`ml-3 px-2 py-1 rounded text-xs font-mono ${LEAD_TIER_COLORS[listing.lead_tier ?? 'unscored']}`}>
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
                <div className="text-center py-8 text-[#c4c5d6]">
                  <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No listings yet</p>
                  <p className="text-xs mt-1">Import listings or use AI research</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Criteria Summary */}
          <Card className="bg-[#13141c] border-[#363a4f]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-[#f0f0f6]">Criteria Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#c4c5d6] mb-1">Target Markets</p>
                <div className="flex flex-wrap gap-1">
                  {(criteria?.location?.target_markets?.length ?? 0) > 0 ? (
                    criteria.location.target_markets.map((m) => (
                      <Badge key={m} variant="secondary" className="bg-[#6366F1]/10 text-[#6366F1] text-xs">
                        {m}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-[#9395a8]">Not specified</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-xs text-[#c4c5d6]">Min Beds</p>
                  <p className="font-mono text-[#f0f0f6]">{criteria?.property?.min_bedrooms || 0}+</p>
                </div>
                <div>
                  <p className="text-xs text-[#c4c5d6]">Min Rating</p>
                  <p className="font-mono text-[#f0f0f6]">{criteria?.performance?.min_rating || 0}+</p>
                </div>
                <div>
                  <p className="text-xs text-[#c4c5d6]">Rate Range</p>
                  <p className="font-mono text-[#f0f0f6]">
                    ${criteria?.performance?.nightly_rate_min || 0}-${criteria?.performance?.nightly_rate_max || 0}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-[#c4c5d6] mb-2">Scoring Weights</p>
                <div className="grid grid-cols-6 gap-1">
                  {criteria?.scoring_weights && Object.entries(criteria.scoring_weights).map(([key, value]) => (
                    <div key={key} className="text-center">
                      <div className="h-12 bg-[#1c1d2b] rounded flex items-end justify-center overflow-hidden">
                        <div
                          className="w-full bg-[#6366F1] transition-all"
                          style={{ height: `${(value as number) * 2}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-[#c4c5d6] mt-1 capitalize">{key}</p>
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
