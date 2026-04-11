interface CrawlRun {
  id: string
  started_at: string
  finished_at: string | null
  status: string
  listings_discovered: number
  listings_updated: number
  listings_errored: number
}

export function CrawlRunsTable({ runs }: { runs: CrawlRun[] }) {
  if (runs.length === 0) {
    return <p className="text-sm text-muted-foreground">No crawl runs yet.</p>
  }

  return (
    <div className="border rounded">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40">
          <tr className="text-left">
            <th className="p-2">Started</th>
            <th className="p-2">Finished</th>
            <th className="p-2">Status</th>
            <th className="p-2">Discovered</th>
            <th className="p-2">Updated</th>
            <th className="p-2">Errored</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-b">
              <td className="p-2">{new Date(r.started_at).toLocaleString()}</td>
              <td className="p-2">
                {r.finished_at ? new Date(r.finished_at).toLocaleString() : '—'}
              </td>
              <td className="p-2">
                <StatusBadge status={r.status} />
              </td>
              <td className="p-2">{r.listings_discovered}</td>
              <td className="p-2">{r.listings_updated}</td>
              <td className="p-2">{r.listings_errored}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colorClass =
    status === 'success' || status === 'ping_ok'
      ? 'text-green-600'
      : status === 'failed'
      ? 'text-red-600'
      : 'text-muted-foreground'
  return <span className={colorClass}>{status}</span>
}
