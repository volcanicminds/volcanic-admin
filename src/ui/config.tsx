/**
 * Admin UI config context — carries project-level extras that aren't derived
 * from the manifest, e.g. custom navigation entries for dashboards / custom
 * pages. Consumed by the Sidebar.
 */
import { createContext, useContext, type ReactNode } from 'react'

export interface AdminNavItem {
  path: string
  /** Already-translated label (or an i18n key the project resolves). */
  label: string
  icon?: string
  group?: string
  order?: number
}

interface AdminConfigValue {
  navExtras: AdminNavItem[]
}

const AdminConfigContext = createContext<AdminConfigValue>({ navExtras: [] })

export function AdminConfigProvider({
  navExtras = [],
  children
}: {
  navExtras?: AdminNavItem[]
  children: ReactNode
}) {
  return (
    <AdminConfigContext.Provider value={{ navExtras }}>{children}</AdminConfigContext.Provider>
  )
}

export function useAdminConfig() {
  return useContext(AdminConfigContext)
}
