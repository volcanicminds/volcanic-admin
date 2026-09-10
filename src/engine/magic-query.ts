/**
 * Magic Query bridge — translates Refine query primitives into the Magic Query
 * string the backend reads, and reads the `v-*` pagination headers back.
 *
 * Aligned to the **v5** grammar (`docs/MAGIC_QUERY_V5.md` in `volcanic-backend`).
 * What changed from v4, and why each change is not cosmetic:
 *
 * - Reserved parameters are underscore-prefixed (`_page`, `_pageSize`, `_sort`), so a column
 *   called `page` or `sort` is a column and not a directive. v4 could not tell them apart.
 * - `_sort` is a comma-separated list where a leading `-` means descending. The v4 form
 *   `sort=field:order` used the same colon that separates a field from its operator.
 * - Operator names lost the `s` suffix, and case-insensitivity became the `i` suffix instead
 *   of an environment variable: in v4 the same URL answered differently on two servers of the
 *   same product.
 * - A range is written `from..to`. v4 used `:`, which collides with the operator separator
 *   and with every ISO timestamp, and the malformed condition was dropped in silence.
 * - `:notNull` is gone: `:null=false` says the same thing with one operator instead of two.
 * - `:overlap` is now `:arrayOverlaps`.
 *
 * The omni-search is no longer a synthetic `q` parameter. v5 has no `q`, and an unknown field
 * responds 400: the OR over the searchable fields is built here, aliased, and combined with
 * the other filters through `_logic`. When `_logic` is present **every** condition must carry
 * an alias and be named in the expression — the backend refuses a half-aliased query rather
 * than guessing, so aliasing is all-or-nothing.
 */
import type { CrudFilter, CrudFilters, CrudSorting, Pagination } from '@refinedev/core'

/** Refine operator → v5 Magic Query operator. Anything absent here is not emitted. */
const OPERATOR_MAP: Record<string, string> = {
  eq: 'eq',
  ne: 'neq',
  lt: 'lt',
  gt: 'gt',
  lte: 'le',
  gte: 'ge',
  in: 'in',
  nin: 'nin',
  // Array columns (Postgres `text[]`) — not Refine operators, emitted by the
  // filter bar for `multiple` enum fields: `&&` any-of, `@>` all-of.
  overlap: 'arrayOverlaps',
  arrayContains: 'arrayContains',
  // The base form is case-sensitive in v5; the `i` suffix is what makes it insensitive, and
  // an admin filter typed by a human wants the insensitive one.
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
  nnull: 'null'
}

/** Operators whose value is a boolean intent rather than data. */
const BOOLEAN_INTENT = new Set(['null', 'nnull'])

function serializeValue(operator: string, value: unknown): string {
  if (Array.isArray(value)) {
    // A range is `from..to`; every other list is comma-separated (`:in`, `:nin`, arrays).
    return operator === 'between' ? value.join('..') : value.join(',')
  }
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function isLogical(filter: CrudFilter): filter is Extract<CrudFilter, { operator: 'or' | 'and' }> {
  return filter.operator === 'or' || filter.operator === 'and'
}

/** One emitted condition, kept alongside the alias `_logic` will refer to it by. */
interface Condition {
  field: string
  operator: string
  value: string
}

/**
 * Flatten a filter tree into conditions plus the boolean expression that joins them.
 *
 * Refine nests `and` / `or` groups; Magic Query keeps the conditions flat in the query string
 * and expresses the shape in `_logic`. The expression is built even when everything is an
 * AND — it is dropped later if it turns out to be redundant, which keeps the common URL short.
 */
function flatten(
  filters: readonly CrudFilter[],
  join: 'AND' | 'OR',
  out: Condition[]
): string {
  const parts: string[] = []

  for (const filter of filters) {
    if (isLogical(filter)) {
      const inner = flatten(filter.value, filter.operator === 'or' ? 'OR' : 'AND', out)
      if (inner) parts.push(`(${inner})`)
      continue
    }

    const { field, operator, value } = filter
    const mqOp = OPERATOR_MAP[operator as string]
    if (!mqOp) continue

    if (BOOLEAN_INTENT.has(operator as string)) {
      // `null: false` means "is not null", and so does the `nnull` operator: both become
      // `:null=false`, because v5 has one operator for the pair.
      const isNull = operator === 'null' ? value !== false : false
      out.push({ field, operator: 'null', value: String(isNull) })
      parts.push(alias(out.length - 1))
      continue
    }

    // An empty value responds 400 in v5 (in v4 it silently searched for the string
    // "notFound"), so a filter with nothing in it is not sent at all.
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value) && value.length === 0) continue

    out.push({ field, operator: mqOp, value: serializeValue(operator as string, value) })
    parts.push(alias(out.length - 1))
  }

  return parts.join(` ${join} `)
}

/** Alias for the nth condition. Charset per the grammar: letter first, then alphanumerics. */
function alias(index: number): string {
  return `c${index}`
}

export interface BuildQueryArgs {
  pagination?: Pagination
  sorters?: CrudSorting
  filters?: CrudFilters
}

export function buildMagicQuery({ pagination, sorters, filters }: BuildQueryArgs): string {
  const params = new URLSearchParams()

  if (pagination?.mode !== 'off') {
    if (pagination?.current) params.set('_page', String(pagination.current))
    if (pagination?.pageSize) params.set('_pageSize', String(pagination.pageSize))
  }

  const sort = (sorters ?? []).map((s) => `${s.order === 'desc' ? '-' : ''}${s.field}`)
  if (sort.length > 0) params.set('_sort', sort.join(','))

  const conditions: Condition[] = []
  const expression = flatten(filters ?? [], 'AND', conditions)

  // `_logic` is sent only when it says something the default does not. Conditions are ANDed
  // by default, so a flat list of ANDs needs no expression — and without `_logic` the
  // conditions need no aliases either, which keeps the everyday URL readable.
  const needsLogic = /\bOR\b/.test(expression)

  conditions.forEach((c, i) => {
    params.append(`${c.field}:${c.operator}${needsLogic ? `[${alias(i)}]` : ''}`, c.value)
  })
  if (needsLogic) params.set('_logic', expression)

  return params.toString()
}

/**
 * Manifest search operator → Refine operator.
 *
 * The manifest names operators in the **backend's** vocabulary (`SearchSpec.operator` is a
 * `FilterOperator`), while everything else reaching this module speaks Refine's. The two
 * overlap in spelling without overlapping in meaning — `contains` is case-sensitive on one
 * side and not on the other — so the translation is written out instead of assumed. Anything
 * unlisted falls back to a case-insensitive contains, which is what a search box is for.
 */
const SEARCH_OPERATOR: Record<string, string> = {
  contains: 'containss',
  containsi: 'contains',
  ncontains: 'ncontainss',
  ncontainsi: 'ncontains',
  starts: 'startswiths',
  startsi: 'startswith',
  ends: 'endswiths',
  endsi: 'endswith',
  eq: 'eq'
}

/**
 * The omni-search box as a Refine filter.
 *
 * The searchable fields come from the manifest (`spec.search.fields`), so the expansion
 * belongs where that spec is read and not in the backend: v5 has no `q` parameter, and a
 * field it does not know responds 400 rather than ignoring it.
 */
export function searchFilter(text: string, fields: readonly string[], operator?: string): CrudFilter[] {
  const term = text.trim()
  if (!term || fields.length === 0) return []
  const refineOperator = SEARCH_OPERATOR[operator ?? ''] ?? 'contains'
  return [
    {
      operator: 'or',
      value: fields.map((field) => ({ field, operator: refineOperator as never, value: term }))
    } as CrudFilter
  ]
}

/** Extract the total record count from Volcanic `v-*` response headers. */
export function readTotal(headers: Headers, fallback: number): number {
  const total = headers.get('v-total') ?? headers.get('v-count')
  const n = total != null ? Number(total) : NaN
  return Number.isFinite(n) ? n : fallback
}
