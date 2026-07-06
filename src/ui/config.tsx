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
  /** Dark-theme variant of the expanded-sidebar logo (CSS-swapped by the `.dark` class).
   *  Use when `logo` is unreadable on a dark background. Also the default fallback for
   *  `loginLogoDark`. */
  logoDark?: string
  /** Smaller logo/mark for the collapsed sidebar. Falls back to the appName initial badge. */
  logoCollapsed?: string
  /** Dark-theme variant of the collapsed-sidebar logo (CSS-swapped by the `.dark` class). */
  logoCollapsedDark?: string
  /** Height (px) of the expanded-sidebar logo. Width stays auto. Default 28. */
  logoHeight?: number
  /** Max width (px) of the expanded-sidebar logo. Default 170. */
  logoMaxWidth?: number
  /** Logo for the login page hero — usually a bigger/richer mark than the compact
   *  sidebar one. Falls back to `logo`. */
  loginLogo?: string
  /** Dark-theme variant of the login logo (CSS-swapped by the `.dark` class).
   *  Use when the light logo is unreadable on a dark background. */
  loginLogoDark?: string
  /** Height (px) of the centered login logo. Default 56. */
  loginLogoHeight?: number
  /** Max width (px) of the login logo. Default 260. */
  loginLogoMaxWidth?: number
  /** Show the "powered by Volcanic Minds" signature on the login page. Default true
   *  (theme-aware light/dark). Set false to hide it (white-label). */
  poweredBy?: boolean
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
