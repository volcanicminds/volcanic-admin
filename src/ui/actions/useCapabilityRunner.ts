/**
 * Runs a manifest action capability against its real endpoint via the data
 * provider's `custom` channel, with toast feedback, list invalidation on
 * `refresh`, and browser download when the action returns a file. Calls the
 * provider directly (not useCustomMutation) so GET actions (e.g. export) work.
 * `runMany` runs it on a selection, one call per record, with a single toast.
 */
import { useState } from 'react'
import { useDataProvider, useInvalidate, type DataProvider } from '@refinedev/core'
import { toast } from 'sonner'
import { interpolatePath, translate, type CapabilitySpec } from '@/engine'

type Rec = Record<string, any>
type Custom = NonNullable<DataProvider['custom']>

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

  const customChannel = () => {
    const { custom } = dataProvider()
    if (!custom) toast.error('Actions require a data provider with custom() support')
    return custom
  }

  const call = (custom: Custom, cap: CapabilitySpec, record?: Rec, body?: Rec) =>
    custom({
      url: interpolatePath(cap.path, record),
      method: cap.method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete',
      payload: { ...(cap.payload ?? {}), ...(body ?? {}) }
    })

  // Invalidate → the affected list/detail refetch and re-bind (no full reload).
  const refresh = (cap: CapabilitySpec) => {
    if (cap.refresh !== false) invalidate({ resource, invalidates: ['list', 'many', 'detail'] })
  }

  const run = async (cap: CapabilitySpec, record?: Rec, label?: string, body?: Rec) => {
    const custom = customChannel()
    if (!custom) return
    setIsRunning(true)
    try {
      const { data } = await call(custom, cap, record, body)
      if (cap.download) download(data, cap, resource)
      else toast.success(label ?? cap.name)
      refresh(cap)
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? `Action "${cap.name}" failed`)
    } finally {
      setIsRunning(false)
    }
  }

  // One record at a time, as an operator clicking each row would send them: a backend that limits
  // or locks per resource sees no burst, and a failure names how many of the selection it hit.
  const runMany = async (cap: CapabilitySpec, records: Rec[], label?: string, body?: Rec) => {
    const custom = customChannel()
    if (!custom) return
    setIsRunning(true)
    const errors: string[] = []
    for (const record of records) {
      try {
        await call(custom, cap, record, body)
      } catch (err) {
        errors.push((err as { message?: string })?.message ?? `Action "${cap.name}" failed`)
      }
    }
    const vars = { label: label ?? cap.name, count: records.length, failed: errors.length }
    if (errors.length) toast.error(`${translate('action.bulk.failed', vars)} ${errors[0]}`)
    else toast.success(translate('action.bulk.done', vars))
    refresh(cap)
    setIsRunning(false)
  }

  return { run, runMany, isRunning }
}
