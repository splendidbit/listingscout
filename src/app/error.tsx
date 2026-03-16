'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import Link from 'next/link'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#08090E] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-full bg-[#EF4444]/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-8 w-8 text-[#EF4444]" />
        </div>

        <h1 className="text-2xl font-bold text-[#EEEEF4] mb-2">
          Something went wrong
        </h1>

        <p className="text-[#B0B0C0] mb-6">
          An unexpected error occurred. This has been logged and we&apos;ll look into it.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <div className="bg-[#0F1117] border border-[#2A2D42] rounded-lg p-4 mb-6 text-left">
            <p className="text-xs font-mono text-[#EF4444] break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-xs font-mono text-[#7A7A90] mt-2">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <Button
            onClick={reset}
            variant="outline"
            className="bg-[#161822] border-[#2A2D42] text-[#EEEEF4] hover:bg-[#1D2030]"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild className="bg-[#6366F1] hover:bg-[#818CF8]">
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Link>
          </Button>
        </div>

        <p className="text-xs text-[#7A7A90] mt-8">
          If this keeps happening, please contact support.
        </p>
      </div>
    </div>
  )
}
