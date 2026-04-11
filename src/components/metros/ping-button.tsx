'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { triggerMetroPing } from '@/lib/metros/actions'

export function PingButton({ metroId }: { metroId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [lastPingAt, setLastPingAt] = useState<string | null>(null)

  const handleClick = () => {
    startTransition(async () => {
      const result = await triggerMetroPing(metroId)
      if (result.ok) {
        toast.success('Ping sent — worker will record a crawl_run row shortly')
        setLastPingAt(new Date().toLocaleTimeString())
        setTimeout(() => router.refresh(), 2000)
      } else {
        toast.error(`Ping failed: ${result.error}`)
      }
    })
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={handleClick} disabled={isPending} variant="outline">
        {isPending ? 'Pinging…' : 'Ping worker'}
      </Button>
      {lastPingAt && (
        <span className="text-xs text-muted-foreground">Last ping: {lastPingAt}</span>
      )}
    </div>
  )
}
