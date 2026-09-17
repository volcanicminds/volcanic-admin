/**
 * Tenant context. The tenant a console declares travels in a header that the providers read from
 * a module-level store, so the (singleton) data provider and auth client inject it without being
 * recreated.
 *
 * On a v5 backend the tenant is bound at the login (T-10.15): before a session the header names
 * the container the login resolves users in, and from then on the token proves it, so a different
 * tenant under the same session is refused. The tenant is therefore either fixed by the deployment
 * (`fixedTenant`) or typed on the login screen and remembered in this browser. A switcher exists
 * only where a deployment supplies its own list and its manifest declares `tenancy.switchable`.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Manifest } from '../types/manifest.js'
import type { Plane } from '../auth/endpoints.js'

export interface TenantOption {
  id: string
  name: string
}

const TENANT_KEY = 'volcanic.admin.tenant'

/** The tenant remembered in this browser from an earlier login, if any. */
export function storedTenant(): string | undefined {
  try {
    return localStorage.getItem(TENANT_KEY) ?? undefined
  } catch {
    return undefined
  }
}

/** Header store consumed by the providers' getContextHeaders(). */
export const tenantStore = {
  header: 'x-tenant-id',
  id: undefined as string | undefined,
  headers(): Record<string, string> {
    return this.id ? { [this.header]: this.id } : {}
  }
}

/**
 * Sets the store before any manifest exists (T-10.12). A multi-tenant manifest is read inside a
 * tenant, so its request needs the header a TenantProvider would only set later. The control plane
 * never declares a tenant.
 */
export function primeTenantStore({ plane, tenant, header }: { plane: Plane; tenant?: string; header?: string }): void {
  if (header) tenantStore.header = header
  tenantStore.id = plane === 'control' ? undefined : (tenant ?? storedTenant())
}

interface TenantContextValue {
  mode: 'single' | 'multi'
  switchable: boolean
  tenants: TenantOption[]
  currentTenantId?: string
  setTenant: (id: string) => void
  /** Fixed by the deployment: never asked, never changed. */
  fixed: boolean
  /** The login screen asks which tenant: multi-tenant, a header to fill, nothing fixed, no switcher. */
  asksTenant: boolean
}

const TenantContext = createContext<TenantContextValue | null>(null)

export interface TenantProviderProps {
  tenancy: Manifest['tenancy']
  /** The tenant of a console that serves one customer. */
  fixedTenant?: string
  /** Tenant list for a switcher; read only when `tenancy.switchable`. */
  fetchTenants?: () => Promise<TenantOption[]>
  children: ReactNode
}

export function TenantProvider({ tenancy, fixedTenant, fetchTenants, children }: TenantProviderProps) {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [chosen, setChosen] = useState<string | undefined>(() => storedTenant())

  const multi = tenancy.mode === 'multi'
  const switchable = Boolean(tenancy.switchable) && multi
  // A header only where the backend reads one. Single tenant, the subdomain resolver and the
  // control plane get none: no CORS preflight, and no context leaked where nobody asked.
  const sendsHeader = multi && (Boolean(tenancy.header) || switchable)
  const current = fixedTenant ?? chosen

  tenantStore.header = tenancy.header ?? 'x-tenant-id'
  tenantStore.id = sendsHeader ? current : undefined

  const setTenant = (id: string) => {
    if (fixedTenant) return
    setChosen(id)
    if (sendsHeader) tenantStore.id = id
    try {
      localStorage.setItem(TENANT_KEY, id)
    } catch {
      /* storage unavailable: the tenant is asked again next time */
    }
  }

  useEffect(() => {
    tenantStore.id = sendsHeader ? current : undefined
  }, [current, sendsHeader])

  useEffect(() => {
    if (switchable && fetchTenants) {
      fetchTenants()
        .then((list) => {
          setTenants(list)
          if (!current && list[0]) setTenant(list[0].id)
        })
        .catch(() => setTenants([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [switchable])

  const value = useMemo<TenantContextValue>(
    () => ({
      mode: tenancy.mode,
      switchable,
      tenants,
      currentTenantId: current,
      setTenant,
      fixed: Boolean(fixedTenant),
      asksTenant: multi && Boolean(tenancy.header) && !fixedTenant && !switchable
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tenancy.mode, tenancy.header, switchable, tenants, current, fixedTenant]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within a TenantProvider')
  return ctx
}
