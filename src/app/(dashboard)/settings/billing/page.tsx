'use client'

import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CreditCard, 
  Zap, 
  Check,
  Crown,
  Building2
} from 'lucide-react'

export default function BillingSettingsPage() {
  // Mock data - in production this would come from a billing service
  const currentPlan: string = 'free'
  const usage = {
    campaigns: 1,
    campaignsLimit: 3,
    listings: 45,
    listingsLimit: 100,
    aiResearches: 2,
    aiResearchesLimit: 5,
  }

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: '/month',
      features: [
        '3 campaigns',
        '100 listings per campaign',
        '5 AI research calls/month',
        'CSV export',
        'Basic scoring',
      ],
      icon: Zap,
      current: currentPlan === 'free',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$29',
      period: '/month',
      features: [
        'Unlimited campaigns',
        '1,000 listings per campaign',
        '100 AI research calls/month',
        'Google Sheets sync',
        'Advanced scoring',
        'Priority support',
      ],
      icon: Crown,
      current: currentPlan === 'pro',
      popular: true,
    },
    {
      id: 'team',
      name: 'Team',
      price: '$99',
      period: '/month',
      features: [
        'Everything in Pro',
        '5 team members',
        'Unlimited AI research',
        'API access',
        'Custom integrations',
        'Dedicated support',
      ],
      icon: Building2,
      current: currentPlan === 'team',
    },
  ]

  return (
    <div className="min-h-screen">
      <Header
        title="Billing & Usage"
        description="Manage your subscription and monitor usage"
      />

      <div className="p-6 space-y-6">
        {/* Current Plan */}
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#f0f0f6]">Current Plan</CardTitle>
                <CardDescription className="text-[#c4c5d6]">
                  You&apos;re currently on the Free plan
                </CardDescription>
              </div>
              <Badge className="bg-[#6366F1]/10 text-[#6366F1] border-0 text-lg px-4 py-1">
                Free
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#c4c5d6]">Campaigns</span>
                  <span className="text-[#f0f0f6]">
                    {usage.campaigns} / {usage.campaignsLimit}
                  </span>
                </div>
                <Progress 
                  value={(usage.campaigns / usage.campaignsLimit) * 100} 
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#c4c5d6]">Listings</span>
                  <span className="text-[#f0f0f6]">
                    {usage.listings} / {usage.listingsLimit}
                  </span>
                </div>
                <Progress 
                  value={(usage.listings / usage.listingsLimit) * 100} 
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#c4c5d6]">AI Research</span>
                  <span className="text-[#f0f0f6]">
                    {usage.aiResearches} / {usage.aiResearchesLimit}
                  </span>
                </div>
                <Progress 
                  value={(usage.aiResearches / usage.aiResearchesLimit) * 100} 
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const Icon = plan.icon
            return (
              <Card 
                key={plan.id}
                className={`bg-[#13141c] border-[#363a4f] relative ${
                  plan.popular ? 'ring-2 ring-[#6366F1]' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#6366F1] text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="w-12 h-12 rounded-full bg-[#6366F1]/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-6 w-6 text-[#6366F1]" />
                  </div>
                  <CardTitle className="text-xl text-[#f0f0f6]">{plan.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-[#f0f0f6]">{plan.price}</span>
                    <span className="text-[#c4c5d6]">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-[#22C55E]" />
                        <span className="text-[#c4c5d6]">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${
                      plan.current
                        ? 'bg-[#363a4f] text-[#c4c5d6] cursor-default'
                        : plan.popular
                        ? 'bg-[#6366F1] hover:bg-[#818CF8]'
                        : 'bg-transparent border border-[#363a4f] hover:bg-[#1c1d2b]'
                    }`}
                    disabled={plan.current}
                  >
                    {plan.current ? 'Current Plan' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Payment Method */}
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-[#c4c5d6]" />
              <div>
                <CardTitle className="text-[#f0f0f6]">Payment Method</CardTitle>
                <CardDescription className="text-[#c4c5d6]">
                  No payment method on file
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              Add Payment Method
            </Button>
          </CardContent>
        </Card>

        {/* Billing Info Notice */}
        <p className="text-center text-sm text-[#9395a8]">
          Billing is handled securely through Stripe. 
          Cancel anytime from your account settings.
        </p>
      </div>
    </div>
  )
}
