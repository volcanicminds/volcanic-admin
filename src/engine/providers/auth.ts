/**
 * Volcanic auth provider — wraps the native `/auth` + `/users/me` endpoints of
 * @volcanicminds/backend. Supports BEARER (token in localStorage) and COOKIE
 * (HttpOnly, credentials: include) modes.
 */
import type { AuthProvider } from '@refinedev/core'
import type { AuthMode } from './data.js'

const TOKEN_KEY = 'volcanic.admin.token'
const REFRESH_KEY = 'volcanic.admin.refresh'

export interface VolcanicAuthOptions {
  apiUrl: string
  authMode?: AuthMode
  endpoints?: {
    login?: string
    logout?: string
    refresh?: string
    me?: string
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? undefined,
  set: (t?: string) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)),
  getRefresh: () => localStorage.getItem(REFRESH_KEY) ?? undefined,
  setRefresh: (t?: string) =>
    t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  }
}

export function createVolcanicAuthProvider(opts: VolcanicAuthOptions): AuthProvider {
  const { apiUrl, authMode = 'cookie' } = opts
  const ep = {
    login: opts.endpoints?.login ?? '/auth/login',
    logout: opts.endpoints?.logout ?? '/auth/logout',
    refresh: opts.endpoints?.refresh ?? '/auth/refresh-token',
    me: opts.endpoints?.me ?? '/users/me'
  }

  const credentials: RequestCredentials = authMode === 'cookie' ? 'include' : 'same-origin'

  function authHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (authMode === 'bearer') {
      const t = tokenStore.get()
      if (t) h.Authorization = `Bearer ${t}`
    }
    return h
  }

  return {
    login: async ({ email, username, password }) => {
      const res = await fetch(`${apiUrl}${ep.login}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials,
        body: JSON.stringify({ email: email ?? username, username: username ?? email, password })
      })
      if (!res.ok) {
        return {
          success: false,
          error: { name: 'LoginError', message: 'Invalid credentials' }
        }
      }
      if (authMode === 'bearer') {
        const data = await res.json().catch(() => ({}))
        if (data?.token) tokenStore.set(data.token)
        if (data?.refreshToken) tokenStore.setRefresh(data.refreshToken)
      }
      return { success: true, redirectTo: '/' }
    },

    logout: async () => {
      try {
        await fetch(`${apiUrl}${ep.logout}`, {
          method: 'POST',
          headers: authHeaders(),
          credentials
        })
      } catch {
        /* ignore network errors on logout */
      }
      tokenStore.clear()
      return { success: true, redirectTo: '/login' }
    },

    check: async () => {
      try {
        const res = await fetch(`${apiUrl}${ep.me}`, {
          method: 'GET',
          headers: authHeaders(),
          credentials
        })
        if (res.ok) return { authenticated: true }
      } catch {
        /* fallthrough */
      }
      return { authenticated: false, redirectTo: '/login', logout: true }
    },

    getIdentity: async () => {
      try {
        const res = await fetch(`${apiUrl}${ep.me}`, {
          method: 'GET',
          headers: authHeaders(),
          credentials
        })
        if (!res.ok) return null
        return await res.json()
      } catch {
        return null
      }
    },

    getPermissions: async () => {
      try {
        const res = await fetch(`${apiUrl}${ep.me}`, {
          method: 'GET',
          headers: authHeaders(),
          credentials
        })
        if (!res.ok) return []
        const me = await res.json()
        return me?.roles ?? []
      } catch {
        return []
      }
    },

    onError: async (error) => {
      if (error?.statusCode === 401 || error?.status === 401) {
        return { logout: true, redirectTo: '/login', error }
      }
      return {}
    }
  }
}
