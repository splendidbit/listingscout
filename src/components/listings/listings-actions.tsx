'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface ListingsActionsProps {
  campaignId: string
  selectedIds: string[]
  totalCount: number
  onClearSelection: () => void
}

export function ListingsActions({ campaignId, selectedIds, totalCount, onClearSelection }: ListingsActionsProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Delete ${selectedIds.length} listing${selectedIds.length > 1 ? 's' : ''}?`)) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: selectedIds }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Deleted ${selectedIds.length} listing${selectedIds.length > 1 ? 's' : ''}`)
      onClearSelection()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteAll = async () => {
    if (!confirm(`Delete ALL ${totalCount} listings from this campaign? This cannot be undone.`)) return
    setIsDeleting(true)
    try {
      const res = await fetch('/api/listings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId, deleteAll: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('All listings deleted')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {selectedIds.length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDeleteSelected}
          disabled={isDeleting}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Delete ({selectedIds.length})
        </Button>
      )}
      {totalCount > 0 && selectedIds.length === 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDeleteAll}
          disabled={isDeleting}
          className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
        >
          {isDeleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
          Clear All
        </Button>
      )}
    </div>
  )
}
