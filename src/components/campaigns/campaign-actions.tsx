'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FileDown, Bot, Settings } from 'lucide-react'
import Link from 'next/link'
import { AirROISearchModal } from './airroi-search-modal'

interface CampaignActionsProps {
  campaignId: string
}

export function CampaignActions({ campaignId }: CampaignActionsProps) {
  const router = useRouter()
  const [searchOpen, setSearchOpen] = useState(false)

  const handleImported = () => {
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/campaigns/${campaignId}/settings`}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a href={`/api/export/csv?campaignId=${campaignId}`}>
            <FileDown className="h-4 w-4 mr-2" />
            Export
          </a>
        </Button>
        <Button
          size="sm"
          className="bg-[#6366F1] hover:bg-[#818CF8]"
          onClick={() => setSearchOpen(true)}
        >
          <Bot className="h-4 w-4 mr-2" />
          Search AirROI
        </Button>
      </div>

      <AirROISearchModal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        campaignId={campaignId}
        onImported={handleImported}
      />
    </>
  )
}
