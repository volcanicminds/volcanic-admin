/**
 * Volcanic data provider — a single Refine DataProvider for every admin
 * resource. Talks to the generic CRUD auto-mounted by the backend admin
 * capability under `/admin/<path>`, using Magic Query for list/sort/filter and
 * the `v-*` headers for pagination totals.
 */
import type { DataProvider, HttpError } from '@refinedev/core'
import { buildMagicQuery, readTotal } from '../magic-query.js'
import { classifyBackendError } from './errors.js'
import { translate } from '../i18n.js'

export type AuthMode = 'bearer' | 'cookie'

export interface VolcanicDataProviderOptions {
  apiUrl: string
  /** Map a Refine resource name to its admin API path segment. */
  resolvePath: (resourceName: string) => string
  authMode?: AuthMode
  /** Access token getter (BEARER mode). */
  getToken?: () => string | undefined
  /** Extra headers (e.g. tenant context). */
  getContextHeaders?: () => Record<string, string>
  basePath?: string // defaults to "/admin"
}

export function createVolcanicDataProvider(opts: VolcanicDataProviderOptions): DataProvider {
  const { apiUrl, resolvePath, authMode = 'cookie', getToken, getContextHeaders } = opts
  const basePath = opts.basePath ?? '/admin'

  const url = (resource: string, suffix = '') =>
    `${apiUrl}${basePath}/${resolvePath(resource)}${suffix}`

  async function request(input: string, init: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(getContextHeaders?.() ?? {}),
      ...((init.headers as Record<string, string>) ?? {})
    }
    if (authMode === 'bearer') {
      const token = getToken?.()
      if (token) headers.Authorization = `Bearer ${token}`
    }
    const res = await fetch(input, {
      ...init,
      headers,
      credentials: authMode === 'cookie' ? 'include' : 'same-origin'
    })
    if (!res.ok) {
      let body: any = undefined
      try {
        body = await res.json()
      } catch {
        /* non-json error */
      }
      // Humanize: never leak raw driver/SQL text into the UI (see errors.ts).
      const classified = classifyBackendError(res.status, body ?? res.statusText)
      const error: HttpError & { code?: string } = {
        message: classified.message ?? translate(classified.messageKey),
        code: classified.code,
        statusCode: res.status,
        errors: body?.errors
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

  return {
    getApiUrl: () => apiUrl,

    getList: async ({ resource, pagination, sorters, filters, meta }) => {
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
      const qs = `id:in=${ids.map(String).join(',')}&pageSize=${ids.length || 1}`
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
      const data = await json<any>(`${target}${qs}`, {
        method: (method ?? 'get').toUpperCase(),
        body: payload ? JSON.stringify(payload) : undefined,
        headers
      })
      return { data }
    }
  }
}
