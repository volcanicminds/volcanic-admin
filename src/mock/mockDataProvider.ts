/**
 * In-memory Refine DataProvider for development without a backend. Honors
 * pagination, sorting and a subset of filters, and expands the vehicle→brand
 * relation on read.
 *
 * Logical groups are evaluated rather than skipped: the omni-search is an `or` group over the
 * manifest's searchable fields now that the backend has no `q` parameter, so a mock that
 * ignored groups would answer every search with the unfiltered list and look like it worked.
 */
import type { CrudFilter, DataProvider } from '@refinedev/core'
import { seed, type Row } from './data'

// Clone the seed so mutations don't leak across reloads of the module.
const store: Record<string, Row[]> = Object.fromEntries(
  Object.entries(seed).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))])
)

function expand(resource: string, row: Row): Row {
  if (resource === 'vehicle' && row.brandId) {
    const brand = store.brand.find((b) => b.id === row.brandId)
    return { ...row, brand: brand ? { id: brand.id, name: brand.name } : undefined }
  }
  return { ...row }
}

function matchValue(row: Row, field: string, operator: string, value: any): boolean {
  const v = row[field]
  switch (operator) {
    case 'eq':
      return String(v) === String(value)
    case 'ne':
      return String(v) !== String(value)
    case 'in':
      return (Array.isArray(value) ? value : String(value).split(',')).map(String).includes(String(v))
    case 'gte':
      return Number(v) >= Number(value)
    case 'lte':
      return Number(v) <= Number(value)
    case 'gt':
      return Number(v) > Number(value)
    case 'lt':
      return Number(v) < Number(value)
    case 'contains':
      return String(v ?? '').toLowerCase().includes(String(value).toLowerCase())
    default:
      return true
  }
}

/** Whether one row satisfies one filter, groups included. */
function matches(row: Row, filter: CrudFilter): boolean {
  if (filter.operator === 'or') return (filter.value as CrudFilter[]).some((f) => matches(row, f))
  if (filter.operator === 'and') return (filter.value as CrudFilter[]).every((f) => matches(row, f))

  const { field, operator, value } = filter as { field: string; operator: string; value: any }
  // An empty filter constrains nothing, exactly as the query builder that drops it intends.
  if (value == null || value === '') return true
  return matchValue(row, field, operator, value)
}

function applyFilter(rows: Row[], filter: CrudFilter): Row[] {
  return rows.filter((r) => matches(r, filter))
}

export const mockDataProvider: DataProvider = {
  getApiUrl: () => 'mock://volcanic-admin',

  getList: async ({ resource, pagination, sorters, filters }) => {
    let rows = [...(store[resource] ?? [])]

    for (const f of filters ?? []) rows = applyFilter(rows, f)

    for (const s of [...(sorters ?? [])].reverse()) {
      rows.sort((a, b) => {
        const av = a[s.field]
        const bv = b[s.field]
        if (av === bv) return 0
        const cmp = av > bv ? 1 : -1
        return s.order === 'desc' ? -cmp : cmp
      })
    }

    const total = rows.length
    if (pagination && pagination.mode !== 'off') {
      const { current = 1, pageSize = 20 } = pagination
      rows = rows.slice((current - 1) * pageSize, current * pageSize)
    }

    return { data: rows.map((r) => expand(resource, r)) as any, total }
  },

  getOne: async ({ resource, id }) => {
    const row = (store[resource] ?? []).find((r) => String(r.id) === String(id))
    return { data: (row ? expand(resource, row) : {}) as any }
  },

  getMany: async ({ resource, ids }) => {
    const set = new Set(ids.map(String))
    const rows = (store[resource] ?? []).filter((r) => set.has(String(r.id)))
    return { data: rows.map((r) => expand(resource, r)) as any }
  },

  create: async ({ resource, variables }) => {
    const ts = new Date().toISOString()
    const row: Row = {
      id: crypto.randomUUID(),
      createdAt: ts,
      updatedAt: ts,
      ...(variables as object)
    }
    if (resource === 'newsletter' && !row.subscribedAt) row.subscribedAt = ts
    store[resource] = [...(store[resource] ?? []), row]
    return { data: expand(resource, row) as any }
  },

  update: async ({ resource, id, variables }) => {
    const rows = store[resource] ?? []
    const idx = rows.findIndex((r) => String(r.id) === String(id))
    if (idx === -1) {
      // Singleton find-or-create fallback.
      const row: Row = { id: String(id), ...(variables as object), updatedAt: new Date().toISOString() }
      store[resource] = [...rows, row]
      return { data: expand(resource, row) as any }
    }
    rows[idx] = { ...rows[idx], ...(variables as object), updatedAt: new Date().toISOString() }
    return { data: expand(resource, rows[idx]) as any }
  },

  deleteOne: async ({ resource, id }) => {
    const rows = store[resource] ?? []
    const idx = rows.findIndex((r) => String(r.id) === String(id))
    const [removed] = idx >= 0 ? rows.splice(idx, 1) : [{}]
    return { data: removed as any }
  },

  deleteMany: async ({ resource, ids }) => {
    const set = new Set(ids.map(String))
    const removed = (store[resource] ?? []).filter((r) => set.has(String(r.id)))
    store[resource] = (store[resource] ?? []).filter((r) => !set.has(String(r.id)))
    return { data: removed as any }
  },

  // Manifest actions (kind:'action') hit their real endpoint via custom().
  custom: async ({ url, payload }) => {
    const segs = String(url).split('?')[0].split('/').filter(Boolean)
    const last = segs[segs.length - 1]

    // status workflow: /<plural>/:id/status
    if (last === 'status' && segs.length >= 3) {
      const id = segs[segs.length - 2]
      const row = (store.vehicle ?? []).find((r) => String(r.id) === String(id))
      if (row) Object.assign(row, (payload as object) ?? {}, { updatedAt: new Date().toISOString() })
      return { data: (row ? expand('vehicle', row) : {}) as any }
    }

    // export: /<plural>/export → return the rows for client-side download
    if (last === 'export') {
      const seg = segs[segs.length - 2] ?? ''
      const resource = store[seg] ? seg : store[seg.replace(/s$/, '')] ? seg.replace(/s$/, '') : seg
      return { data: (store[resource] ?? []) as any }
    }

    return { data: {} as any }
  }
}
