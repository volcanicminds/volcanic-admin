/**
 * Magic Query bridge — translates Refine query primitives into the
 * `@volcanicminds/typeorm` Magic Query string format and reads the `v-*`
 * pagination headers from responses.
 *
 * Format: `field:operator=value`, `sort=field:order`, `page`, `pageSize`.
 * Omni-search: a filter on the synthetic field `q` is emitted as a raw `q=`
 * param (the backend expands it into an OR `containsi` over `search.fields`).
 * The `raw` operator is never produced.
 */
import type { CrudFilter, CrudFilters, CrudSorting, Pagination } from '@refinedev/core'

const OPERATOR_MAP: Record<string, string> = {
  eq: 'eq',
  ne: 'neq',
  lt: 'lt',
  gt: 'gt',
  lte: 'le',
  gte: 'ge',
  in: 'in',
  nin: 'nin',
  contains: 'containsi',
  containss: 'contains',
  ncontains: 'ncontainsi',
  ncontainss: 'ncontains',
  startswith: 'startsi',
  startswiths: 'starts',
  endswith: 'endsi',
  endswiths: 'ends',
  between: 'between',
  null: 'null',
  nnull: 'notNull'
}

function serializeValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(',')
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function isLogical(filter: CrudFilter): filter is Extract<CrudFilter, { operator: 'or' | 'and' }> {
  return filter.operator === 'or' || filter.operator === 'and'
}

function appendFilter(params: URLSearchParams, filter: CrudFilter): void {
  // Flatten logical AND groups; OR omni-search is expressed via the `q` param.
  if (isLogical(filter)) {
    if (filter.operator === 'and') {
      for (const f of filter.value) appendFilter(params, f)
    }
    return
  }

  const { field, operator, value } = filter
  if (value === undefined || value === null || value === '') {
    // null/notNull carry a boolean intent rather than a value.
    if (operator !== 'null' && operator !== 'nnull') return
  }

  // Synthetic omni-search field.
  if (field === 'q') {
    params.set('q', serializeValue(value))
    return
  }

  const mqOp = OPERATOR_MAP[operator as string]
  if (!mqOp) return

  if (mqOp === 'null') {
    // value === false means "is not null"
    params.append(`${field}:${value === false ? 'notNull' : 'null'}`, 'true')
    return
  }
  if (mqOp === 'notNull') {
    params.append(`${field}:notNull`, 'true')
    return
  }

  params.append(`${field}:${mqOp}`, serializeValue(value))
}

export interface BuildQueryArgs {
  pagination?: Pagination
  sorters?: CrudSorting
  filters?: CrudFilters
}

export function buildMagicQuery({ pagination, sorters, filters }: BuildQueryArgs): string {
  const params = new URLSearchParams()

  if (pagination?.mode !== 'off') {
    if (pagination?.current) params.set('page', String(pagination.current))
    if (pagination?.pageSize) params.set('pageSize', String(pagination.pageSize))
  }

  for (const s of sorters ?? []) {
    params.append('sort', `${s.field}:${s.order}`)
  }

  for (const f of filters ?? []) {
    appendFilter(params, f)
  }

  return params.toString()
}

/** Extract the total record count from Volcanic `v-*` response headers. */
export function readTotal(headers: Headers, fallback: number): number {
  const total = headers.get('v-total') ?? headers.get('v-count')
  const n = total != null ? Number(total) : NaN
  return Number.isFinite(n) ? n : fallback
}
