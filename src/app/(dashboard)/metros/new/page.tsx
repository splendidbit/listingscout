import { MetroForm } from '@/components/metros/metro-form'

export default function NewMetroPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">New metro</h1>
      <MetroForm mode="create" />
    </div>
  )
}
