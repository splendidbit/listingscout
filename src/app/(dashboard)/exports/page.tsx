import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Download } from 'lucide-react'

export default function ExportsPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Exports"
        description="Export history and downloads"
      />

      <div className="p-6">
        <Card className="bg-[#12121A] border-[#2A2A3C]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Download className="h-12 w-12 text-[#5C5C72] mb-4" />
            <h3 className="text-lg font-medium text-[#F0F0F5] mb-2">
              No exports yet
            </h3>
            <p className="text-sm text-[#9494A8]">
              Exports will appear here once you download or sync data
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
