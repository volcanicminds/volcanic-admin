/**
 * Custom page — mounted at /dashboard as the landing route (see main.tsx).
 * Plain React + Refine hooks against the same data layer as the rest of the admin.
 */
import { useList } from '@refinedev/core'

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-3xl font-semibold">{value}</div>
    </div>
  )
}

export function Dashboard() {
  const { data: vehicles } = useList({ resource: 'vehicle', pagination: { pageSize: 1 } })
  const { data: brands } = useList({ resource: 'brand', pagination: { pageSize: 1 } })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Veicoli" value={vehicles?.total ?? '—'} />
        <Stat label="Brand" value={brands?.total ?? '—'} />
      </div>
    </div>
  )
}
