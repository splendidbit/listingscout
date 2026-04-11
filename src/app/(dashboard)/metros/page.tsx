import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function MetrosPage() {
  const supabase = await createClient()

  const { data: metros, error } = await supabase
    .from('metros')
    .select('id, name, slug, state, crawl_enabled, last_crawled_at, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Metros</h1>
        <p className="text-red-500">Error loading metros: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Metros</h1>
        <Button asChild>
          <Link href="/metros/new">New metro</Link>
        </Button>
      </div>

      {metros && metros.length === 0 ? (
        <div className="rounded border border-dashed p-12 text-center">
          <p className="text-muted-foreground mb-4">No metros configured yet.</p>
          <Button asChild>
            <Link href="/metros/new">Create your first metro</Link>
          </Button>
        </div>
      ) : (
        <div className="border rounded">
          <table className="w-full">
            <thead className="border-b bg-muted/40">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-3">Name</th>
                <th className="p-3">Slug</th>
                <th className="p-3">State</th>
                <th className="p-3">Crawl</th>
                <th className="p-3">Last crawled</th>
              </tr>
            </thead>
            <tbody>
              {metros?.map((m) => (
                <tr key={m.id} className="border-b hover:bg-muted/20">
                  <td className="p-3">
                    <Link href={`/metros/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">{m.slug}</td>
                  <td className="p-3 text-sm">{m.state}</td>
                  <td className="p-3 text-sm">
                    {m.crawl_enabled ? (
                      <span className="text-green-600">Enabled</span>
                    ) : (
                      <span className="text-muted-foreground">Disabled</span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-muted-foreground">
                    {m.last_crawled_at
                      ? new Date(m.last_crawled_at).toLocaleString()
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
