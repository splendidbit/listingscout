import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Home } from 'lucide-react'

export default function ListingsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="All Listings"
        description="View listings across all campaigns"
      />

      <div className="p-6">
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-[#9395a8] mb-4" />
            <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
              No listings yet
            </h3>
            <p className="text-sm text-[#c4c5d6]">
              Listings will appear here once you add them to campaigns
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
