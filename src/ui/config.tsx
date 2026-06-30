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

/** Brand identity shown in the sidebar header + login (logo + app name). */
export interface AdminBranding {
  /** App name in the sidebar header, the login title, and the fallback badge initial. Default 'Volcanic Admin'. */
  appName?: string
  /** Logo image src for the expanded sidebar + login. Replaces the default badge + wordmark. */
  logo?: string
  /** Smaller logo/mark for the collapsed sidebar. Falls back to the appName initial badge. */
  logoCollapsed?: string
  /** Height (px) of the expanded-sidebar logo. Width stays auto. Default 28. */
  logoHeight?: number
  /** Max width (px) of the expanded-sidebar logo. Default 170. */
  logoMaxWidth?: number
}

interface AdminConfigValue {
  navExtras: AdminNavItem[]
  branding?: AdminBranding
}

const AdminConfigContext = createContext<AdminConfigValue>({ navExtras: [] })

export function AdminConfigProvider({
  navExtras = [],
  branding,
  children
}: {
  navExtras?: AdminNavItem[]
  branding?: AdminBranding
  children: ReactNode
}) {
  return (
    <AdminConfigContext.Provider value={{ navExtras, branding }}>
      {children}
    </AdminConfigContext.Provider>
  )
}

export function useAdminConfig() {
  return useContext(AdminConfigContext)
}
