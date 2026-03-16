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
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Download className="h-12 w-12 text-[#9395a8] mb-4" />
            <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
              No exports yet
            </h3>
            <p className="text-sm text-[#c4c5d6]">
              Exports will appear here once you download or sync data
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
