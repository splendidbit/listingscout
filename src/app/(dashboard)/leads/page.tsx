import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Target } from 'lucide-react'

export default function LeadsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Leads"
        description="Strong leads across all campaigns"
      />

      <div className="p-6">
        <Card className="bg-[#12121A] border-[#2A2A3C]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-12 w-12 text-[#5C5C72] mb-4" />
            <h3 className="text-lg font-medium text-[#F0F0F5] mb-2">
              No leads yet
            </h3>
            <p className="text-sm text-[#9494A8]">
              Strong leads will appear here once you score listings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
