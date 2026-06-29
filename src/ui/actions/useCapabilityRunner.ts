/**
 * Runs a manifest action capability against its real endpoint via the data
 * provider's `custom` channel, with toast feedback, list invalidation on
 * `refresh`, and browser download when the action returns a file. Calls the
 * provider directly (not useCustomMutation) so GET actions (e.g. export) work.
 */
import { useState } from 'react'
import { useDataProvider, useInvalidate } from '@refinedev/core'
import { toast } from 'sonner'
import { interpolatePath, type CapabilitySpec } from '@/engine'

type Rec = Record<string, any>

function toCsv(rows: Rec[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0]).filter((k) => typeof rows[0][k] !== 'object')
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n')
}

function download(data: unknown, cap: CapabilitySpec, resource: string) {
  const csv = cap.download?.includes('csv')
  let content: string
  if (Array.isArray(data)) content = csv ? toCsv(data) : JSON.stringify(data, null, 2)
  else if (typeof data === 'string') content = data
  else content = JSON.stringify(data ?? {}, null, 2)
  const blob = new Blob([content], { type: cap.download || 'application/octet-stream' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${resource}-${cap.name}.${csv ? 'csv' : 'txt'}`
  a.click()
  URL.revokeObjectURL(a.href)
}

export function useCapabilityRunner(resource: string) {
  const dataProvider = useDataProvider()
  const invalidate = useInvalidate()
  const [isRunning, setIsRunning] = useState(false)

  const run = async (cap: CapabilitySpec, record?: Rec, label?: string) => {
    const provider = dataProvider()
    if (!provider.custom) {
      toast.error('Actions require a data provider with custom() support')
      return
    }
    setIsRunning(true)
    try {
      const { data } = await provider.custom({
        url: interpolatePath(cap.path, record),
        method: cap.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
        payload: cap.payload ?? {}
      })
      if (cap.download) download(data, cap, resource)
      else toast.success(label ?? cap.name)
      if (cap.refresh !== false) {
        invalidate({ resource, invalidates: ['list', 'many', 'detail'] })
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? `Action "${cap.name}" failed`)
    } finally {
      setIsRunning(false)
    }
  }

  return { run, isRunning }
}
