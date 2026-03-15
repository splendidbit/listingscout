'use client'

import { useState } from 'react'
import { ListingsTable, ListingRow } from './listings-table'
import { ListingsActions } from './listings-actions'
import { ScoreActions } from '@/components/scoring/score-actions'
import Link from 'next/link'

interface ListingsPageClientProps {
  campaignId: string
  listingData: ListingRow[]
  unscoredCount: number
}

export function ListingsPageClient({ campaignId, listingData, unscoredCount }: ListingsPageClientProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  return (
    <>
      <div className="flex items-center justify-between">
        <Link href={`/campaigns/${campaignId}`} className="text-sm text-[#6366F1] hover:text-[#818CF8]">
          ← Back to campaign
        </Link>
        <div className="flex items-center gap-2">
          <ListingsActions
            campaignId={campaignId}
            selectedIds={selectedIds}
            totalCount={listingData.length}
            onClearSelection={() => setSelectedIds([])}
          />
          <ScoreActions
            campaignId={campaignId}
            unscoredCount={unscoredCount}
            totalCount={listingData.length}
          />
        </div>
      </div>
      <ListingsTable
        data={listingData}
        selectable
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </>
  )
}
