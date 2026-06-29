/**
 * Tenant context — multi-tenant switcher state. The selected tenant is mirrored
 * into a module-level store so the (singleton) data provider can inject the
 * tenant header on every request without being recreated.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Manifest } from '../types/manifest.js'

export interface TenantOption {
  id: string
  name: string
}

const TENANT_KEY = 'volcanic.admin.tenant'

/** Header store consumed by the data provider's getContextHeaders(). */
export const tenantStore = {
  header: 'x-tenant-id',
  id: undefined as string | undefined,
  headers(): Record<string, string> {
    return this.id ? { [this.header]: this.id } : {}
  }
}

interface TenantContextValue {
  mode: 'single' | 'multi'
  switchable: boolean
  tenants: TenantOption[]
  currentTenantId?: string
  setTenant: (id: string) => void
}

const TenantContext = createContext<TenantContextValue | null>(null)

export interface TenantProviderProps {
  tenancy: Manifest['tenancy']
  /** Fetches the tenant list (typically GET /tenants). */
  fetchTenants?: () => Promise<TenantOption[]>
  children: ReactNode
}

export function TenantProvider({ tenancy, fetchTenants, children }: TenantProviderProps) {
  const [tenants, setTenants] = useState<TenantOption[]>([])
  const [currentTenantId, setCurrentTenantId] = useState<string | undefined>(
    () => localStorage.getItem(TENANT_KEY) ?? undefined
  )

  tenantStore.header = tenancy.header ?? 'x-tenant-id'
  // Single-tenant: never emit the tenant header (avoids CORS preflight + leaking context).
  tenantStore.id = tenancy.mode === 'multi' ? currentTenantId : undefined

  const setTenant = (id: string) => {
    setCurrentTenantId(id)
    tenantStore.id = id
    localStorage.setItem(TENANT_KEY, id)
  }

  useEffect(() => {
    tenantStore.id = tenancy.mode === 'multi' ? currentTenantId : undefined
  }, [currentTenantId, tenancy.mode])

  useEffect(() => {
    if (tenancy.mode === 'multi' && fetchTenants) {
      fetchTenants()
        .then((list) => {
          setTenants(list)
          if (!currentTenantId && list[0]) setTenant(list[0].id)
        })
        .catch(() => setTenants([]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenancy.mode])

  const value = useMemo<TenantContextValue>(
    () => ({
      mode: tenancy.mode,
      switchable: Boolean(tenancy.switchable) && tenancy.mode === 'multi',
      tenants,
      currentTenantId,
      setTenant
    }),
    [tenancy.mode, tenancy.switchable, tenants, currentTenantId]
  )

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}

export function useTenant(): TenantContextValue {
  const ctx = useContext(TenantContext)
  if (!ctx) throw new Error('useTenant must be used within a TenantProvider')
  return ctx
}
