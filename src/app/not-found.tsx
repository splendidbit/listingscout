import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Search } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#09090f] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-8xl font-bold text-[#6366F1] mb-4">404</div>

        <h1 className="text-2xl font-bold text-[#f0f0f6] mb-2">
          Page not found
        </h1>

        <p className="text-[#c4c5d6] mb-8">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <div className="flex items-center justify-center gap-3">
          <Button asChild className="bg-[#6366F1] hover:bg-[#818CF8]">
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/campaigns">
              <Search className="h-4 w-4 mr-2" />
              View Campaigns
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
