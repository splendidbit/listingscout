import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Users } from 'lucide-react'

export default function OwnersPage() {
  return (
    <div className="min-h-screen">
      <Header
        title="Owners"
        description="Discovered property owners"
      />

      <div className="p-6">
        <Card className="bg-[#13141c] border-[#363a4f]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-[#9395a8] mb-4" />
            <h3 className="text-lg font-medium text-[#f0f0f6] mb-2">
              No owners found yet
            </h3>
            <p className="text-base text-[#c4c5d6]">
              Owner information will appear here once you run research
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
