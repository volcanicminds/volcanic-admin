/**
 * Volcanic data provider — a single Refine DataProvider for every admin
 * resource. Talks to the routes the manifest describes, at
 * `<apiUrl><basePath>/<resource path>`, using Magic Query for list/sort/filter and
 * the `v-*` headers for pagination totals. A v5 backend mounts those routes at the
 * API root (`/admin` holds the manifest only), so `basePath` is empty by default.
 */
import type { DataProvider, HttpError } from '@refinedev/core'
import { buildMagicQuery, readTotal } from '../magic-query.js'
import { classifyBackendError } from './errors.js'
import { translate } from '../i18n.js'
import { createApiRequest, type AuthMode } from './http.js'

export type { AuthMode } from './http.js'

export interface VolcanicDataProviderOptions {
  apiUrl: string
  /** Map a Refine resource name to its admin API path segment. */
  resolvePath: (resourceName: string) => string
  authMode?: AuthMode
  /** Access token getter (BEARER mode). */
  getToken?: () => string | undefined
  /** Extra headers (e.g. tenant context). */
  getContextHeaders?: () => Record<string, string>
  /**
   * Called once on a 401 before the error reaches Refine (whose `onError` logs out): when it
   * resolves `true` the request is sent again, with whatever credential the renewal left.
   */
  renewSession?: () => Promise<boolean>
  /** Called once on a 403 `STEP_UP_REQUIRED`; `true` sends the request again (see `ApiRequestOptions`). */
  confirmIdentity?: (maxAge?: number) => Promise<boolean>
  /** Prefix between `apiUrl` and the resource path, for an API published under a sub-path. Default `''`. */
  basePath?: string
}

/** Page size requested when walking every page (`pagination.mode: 'off'`). The
 *  backend caps it (VOLCANIC_MAX_PAGE_SIZE, 100 by default) and reports what it
 *  actually applied in `v-pageSize`. */
const FETCH_ALL_CHUNK = 100
/** Safety net for the walk: never loop forever on a missing/wrong `v-total`. */
const FETCH_ALL_MAX_PAGES = 500

/** `v-total` alone, `undefined` when absent: `v-count` counts the rows of one page, so it
 *  cannot tell the walk where the collection ends. */
function reportedTotal(headers: Headers): number | undefined {
  const raw = headers.get('v-total')
  const n = raw ? Number(raw) : NaN
  return Number.isFinite(n) ? n : undefined
}

export function createVolcanicDataProvider(opts: VolcanicDataProviderOptions): DataProvider {
  const { apiUrl, resolvePath, authMode = 'cookie', getToken, getContextHeaders, renewSession, confirmIdentity } =
    opts
  const basePath = opts.basePath ?? ''

  const url = (resource: string, suffix = '') =>
    `${apiUrl}${basePath}/${resolvePath(resource)}${suffix}`

  // Headers, credentials, the one renewal and the one step-up come from the builder the manifest
  // loader uses too.
  const send = createApiRequest({ authMode, getToken, getContextHeaders, renewSession, confirmIdentity })

  async function request(input: string, init: RequestInit = {}): Promise<Response> {
    const res = await send(input, init)
    if (!res.ok) {
      let body: any = undefined
      try {
        body = await res.json()
      } catch {
        /* non-json error */
      }
      // Humanize: never leak raw driver/SQL text into the UI (see errors.ts).
      const classified = classifyBackendError(res.status, body ?? res.statusText)
      const error: HttpError & { code?: string; remaining?: number } = {
        message: classified.message ?? translate(classified.messageKey),
        code: classified.code,
        statusCode: res.status,
        errors: body?.errors,
        // Attempts left on a code, as data: the caller words it, the backend's prose is for logs.
        ...(typeof body?.remaining === 'number' ? { remaining: body.remaining } : {})
      }
      throw error
    }
    return res
  }

  async function json<T>(input: string, init?: RequestInit): Promise<T> {
    const res = await request(input, init)
    if (res.status === 204) return undefined as T
    return (await res.json()) as T
  }

  /**
   * Every record matching the filters (Refine's `pagination.mode: 'off'`).
   *
   * The API always paginates (omitting page/pageSize just yields its default
   * first page), so "no pagination" has to be walked page by page. The requested
   * size is capped server-side, and `skip` is computed from the size the client
   * asked for: keep asking for exactly the size the server reports applying
   * (`v-pageSize`), otherwise skip/take drift apart and rows fall between pages.
   *
   * The walk ends on an empty page or a body that is not an array, once `v-total`
   * rows are read, or, when the response carries no `v-total`, on the first page
   * shorter than the size applied to it.
   */
  async function getAllPages(
    resource: string,
    sorters: Parameters<NonNullable<DataProvider['getList']>>[0]['sorters'],
    filters: Parameters<NonNullable<DataProvider['getList']>>[0]['filters'],
    headers?: Record<string, string>
  ) {
    const all: any[] = []
    let pageSize = FETCH_ALL_CHUNK
    let total: number | undefined

    for (let page = 1; page <= FETCH_ALL_MAX_PAGES; page++) {
      const qs = buildMagicQuery({
        pagination: { current: page, pageSize, mode: 'server' },
        sorters,
        filters
      })
      const res = await request(`${url(resource)}?${qs}`, { method: 'GET', headers })
      const chunk: unknown = await res.json()
      // A v5 list answers with the rows as the body; anything else carries no rows.
      if (!Array.isArray(chunk)) break
      all.push(...chunk)
      total = reportedTotal(res.headers)

      const applied = Number(res.headers.get('v-pageSize'))
      if (Number.isFinite(applied) && applied > 0) pageSize = applied

      if (chunk.length === 0) break
      if (total !== undefined ? all.length >= total : chunk.length < pageSize) break
    }
    return { data: all, total: total || all.length }
  }

  return {
    getApiUrl: () => apiUrl,

    getList: async ({ resource, pagination, sorters, filters, meta }) => {
      if (pagination?.mode === 'off') {
        return getAllPages(resource, sorters, filters, meta?.headers)
      }
      const qs = buildMagicQuery({ pagination, sorters, filters })
      const target = `${url(resource)}${qs ? `?${qs}` : ''}`
      const res = await request(target, { method: 'GET', headers: meta?.headers })
      const data = await res.json()
      return { data, total: readTotal(res.headers, data.length) }
    },

    getOne: async ({ resource, id, meta }) => {
      // Singletons live at the base path (GET /company), not /company/:id.
      const target = meta?.singleton ? url(resource) : url(resource, `/${id}`)
      const data = await json<any>(target, { method: 'GET', headers: meta?.headers })
      return { data }
    },

    getMany: async ({ resource, ids, meta }) => {
      const qs = `id:in=${ids.map(String).join(',')}&_pageSize=${ids.length || 1}`
      const data = await json<any>(`${url(resource)}?${qs}`, { method: 'GET', headers: meta?.headers })
      return { data }
    },

    create: async ({ resource, variables, meta }) => {
      const data = await json<any>(url(resource), {
        method: 'POST',
        body: JSON.stringify(variables),
        headers: meta?.headers
      })
      return { data }
    },

    update: async ({ resource, id, variables, meta }) => {
      // Singletons update at the base path (PUT /company), not /company/:id.
      const target = meta?.singleton ? url(resource) : url(resource, `/${id}`)
      const data = await json<any>(target, {
        method: 'PUT',
        body: JSON.stringify(variables),
        headers: meta?.headers
      })
      return { data }
    },

    deleteOne: async ({ resource, id, meta }) => {
      const data = await json<any>(url(resource, `/${id}`), {
        method: 'DELETE',
        headers: meta?.headers
      })
      return { data }
    },

    deleteMany: async ({ resource, ids, meta }) => {
      const data = await json<any>(url(resource), {
        method: 'DELETE',
        body: JSON.stringify({ ids }),
        headers: meta?.headers
      })
      return { data }
    },

    custom: async ({ url: customUrl, method, payload, query, headers }) => {
      const qs = query ? `?${new URLSearchParams(query as Record<string, string>)}` : ''
      const target = customUrl.startsWith('http') ? customUrl : `${apiUrl}${customUrl}`
      const verb = (method ?? 'get').toUpperCase()
      // A GET or a HEAD may not carry a body, and the action runner always passes one, if only an
      // empty object: fetch refuses the request before it leaves the page, so every GET action
      // (an export, a report) failed without ever reaching the backend. Any other verb sends even
      // an empty object: a route with a body schema refuses a request with none ("body must be object").
      // A FormData (an upload) goes as it is: JSON would empty it.
      const bodyless = verb === 'GET' || verb === 'HEAD' || payload == null
      const body = bodyless ? undefined : payload instanceof FormData ? payload : JSON.stringify(payload)
      const data = await json<any>(`${target}${qs}`, { method: verb, body, headers })
      return { data }
    }
  }
}
