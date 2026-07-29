/**
 * Per-resource list UI state — search, sort, filters and page.
 *
 * The state is keyed by resource name and persisted in `sessionStorage`, so it
 * survives navigating to a record and coming back (browser BACK included) but
 * never leaks from one list to another: each resource reads and writes its own
 * slot. React Router renders the same `ListView` element type across resource
 * routes, so without this the component instance (and its state) is reused —
 * that is how a filter set on one list showed up on the next one.
 *
 * Durable preferences (layout, page size) stay in `localStorage`, see ListView.
 */
import { useEffect, useState } from 'react'
import type { CrudSorting } from '@refinedev/core'
import type { ResourceModel } from '@/engine'
import type { FilterDraft } from './FilterBar'

export interface ListUiState {
  /** 1-based current page. */
  page: number
  /** Omni-search term actually applied to the query (not the input draft). */
  search: string
  sorters: CrudSorting
  filters: FilterDraft
}

const stateKey = (name: string) => `volcanic.admin.list.${name}.state`

function defaultState(model: ResourceModel): ListUiState {
  return {
    page: 1,
    search: '',
    sorters: (model.spec.defaultSort ?? []).map((s) => ({ field: s.field, order: s.order })),
    filters: {}
  }
}

/**
 * Keep only what still makes sense for the current manifest — a stored sort or
 * filter on a field that no longer exists would silently break the query.
 */
function sanitize(model: ResourceModel, raw: unknown): ListUiState | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const page = typeof o.page === 'number' && Number.isInteger(o.page) && o.page >= 1 ? o.page : 1
  const search = typeof o.search === 'string' ? o.search : ''

  const sorters: CrudSorting = Array.isArray(o.sorters)
    ? (o.sorters as unknown[]).filter((s): s is { field: string; order: 'asc' | 'desc' } => {
        if (!s || typeof s !== 'object') return false
        const { field, order } = s as { field?: unknown; order?: unknown }
        if (typeof field !== 'string' || !field) return false
        if (order !== 'asc' && order !== 'desc') return false
        // A relation sorter looks like `owner.name`: validate its base field.
        return Boolean(model.field(field.split('.')[0]))
      })
    : []

  const filters: FilterDraft = {}
  if (o.filters && typeof o.filters === 'object') {
    for (const [name, v] of Object.entries(o.filters as Record<string, unknown>)) {
      if (model.field(name)) filters[name] = v
    }
  }

  return { page, search, sorters, filters }
}

function load(model: ResourceModel): ListUiState {
  try {
    const raw = sessionStorage.getItem(stateKey(model.spec.name))
    if (!raw) return defaultState(model)
    return sanitize(model, JSON.parse(raw)) ?? defaultState(model)
  } catch {
    return defaultState(model)
  }
}

function save(name: string, state: ListUiState) {
  try {
    sessionStorage.setItem(stateKey(name), JSON.stringify(state))
  } catch {
    // Private mode / quota — the list still works, it just won't be restored.
  }
}

export interface ListStateApi {
  state: ListUiState
  setPage: (page: number) => void
  /** Applies a search term (and returns to the first page). */
  setSearch: (search: string) => void
  setSorters: (sorters: CrudSorting) => void
  setFilters: (filters: FilterDraft) => void
}

export function useListState(model: ResourceModel): ListStateApi {
  const name = model.spec.name
  const [state, setState] = useState<ListUiState>(() => load(model))
  const [owner, setOwner] = useState(name)

  // Belt and braces: routes carry a per-resource key so this component
  // remounts, but if it ever gets reused across resources, swap the state in
  // during render rather than serving the previous resource's filters.
  let current = state
  if (owner !== name) {
    current = load(model)
    setOwner(name)
    setState(current)
  }

  useEffect(() => {
    if (owner !== name) return
    save(name, state)
  }, [name, owner, state])

  const patch = (p: Partial<ListUiState>) => setState((prev) => ({ ...prev, ...p }))

  return {
    state: current,
    setPage: (page) => patch({ page }),
    // Any change to what is being asked of the server invalidates the page.
    setSearch: (search) => patch({ search, page: 1 }),
    setSorters: (sorters) => patch({ sorters, page: 1 }),
    setFilters: (filters) => patch({ filters, page: 1 })
  }
}
