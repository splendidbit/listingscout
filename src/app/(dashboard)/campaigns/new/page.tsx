import { Header } from '@/components/layout/header'
import { CampaignWizard } from '@/components/campaigns/campaign-wizard'

export default function NewCampaignPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="New Campaign"
        description="Create a new listing research campaign"
      />
      <div className="p-6">
        <CampaignWizard />
      </div>
    </div>
  )
}
