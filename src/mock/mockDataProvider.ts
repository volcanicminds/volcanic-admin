/**
 * In-memory Refine DataProvider for development without a backend. Honors
 * pagination, sorting and a subset of filters (including the `q` omni-search),
 * and expands the vehicle→brand relation on read.
 */
import type { CrudFilter, DataProvider } from '@refinedev/core'
import { seed, type Row } from './data'

// Clone the seed so mutations don't leak across reloads of the module.
const store: Record<string, Row[]> = Object.fromEntries(
  Object.entries(seed).map(([k, rows]) => [k, rows.map((r) => ({ ...r }))])
)

const SEARCH_FIELDS: Record<string, string[]> = {
  vehicle: ['name', 'trimLevel', 'description', 'tag'],
  brand: ['name'],
  newsletter: ['email']
}

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

function applyFilter(resource: string, rows: Row[], filter: CrudFilter): Row[] {
  if (filter.operator === 'and' || filter.operator === 'or') {
    return rows // logical groups not needed for the mock
  }
  const { field, operator, value } = filter as {
    field: string
    operator: string
    value: any
  }
  if (value == null || value === '') return rows

  // Omni-search.
  if (field === 'q') {
    const fields = SEARCH_FIELDS[resource] ?? []
    const needle = String(value).toLowerCase()
    return rows.filter((r) => fields.some((f) => String(r[f] ?? '').toLowerCase().includes(needle)))
  }
  return rows.filter((r) => matchValue(r, field, operator as string, value))
}

export const mockDataProvider: DataProvider = {
  getApiUrl: () => 'mock://volcanic-admin',

  getList: async ({ resource, pagination, sorters, filters }) => {
    let rows = [...(store[resource] ?? [])]

    for (const f of filters ?? []) rows = applyFilter(resource, rows, f)

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
  }
}
