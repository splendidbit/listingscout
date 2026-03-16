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
        <Card className="bg-[#0F1117] border-[#2A2D42]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-[#7A7A90] mb-4" />
            <h3 className="text-lg font-medium text-[#EEEEF4] mb-2">
              No listings yet
            </h3>
            <p className="text-sm text-[#B0B0C0]">
              Listings will appear here once you add them to campaigns
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
