/**
 * <VolcanicAdmin> — the public root component. Mounts the whole admin from a
 * small set of props: where the backend is, how to authenticate, the i18n
 * dictionaries, and project overrides (widgets/views/actions, custom pages).
 *
 * Data source resolution:
 *   - pass `manifest` for a static manifest (dev/SSR), or `loadManifest`, or
 *     nothing → it fetches `${apiUrl}/admin/manifest`.
 *   - pass `dataProvider`/`authClient` to override (e.g. a mock), otherwise the
 *     real Volcanic providers are built from `apiUrl` + `authMode`.
 */
import { useMemo, type ComponentType, type ReactNode } from 'react'
import { Refine, Authenticated, usePermissions } from '@refinedev/core'
import type { AuthProvider, DataProvider } from '@refinedev/core'
import routerProvider, {
  NavigateToResource,
  CatchAllNavigate,
  UnsavedChangesNotifier,
  DocumentTitleHandler
} from '@refinedev/react-router'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'

import {
  ManifestProvider,
  I18nProvider,
  RegistryProvider,
  TenantProvider,
  createOverrideRegistry,
  createVolcanicAccessControlProvider,
  createVolcanicDataProvider,
  createVolcanicAuthProvider,
  createVolcanicAuthClient,
  AuthClientProvider,
  tokenStore,
  tenantStore,
  rolesStore,
  toRefineResources
} from './engine'
import type {
  AdminModel,
  AuthClient,
  AuthMode,
  Dictionaries,
  Manifest,
  ManifestOverrides,
  TenantOption
} from './engine'
import {
  AdminLayout,
  AdminConfigProvider,
  LoginView,
  ForgotPasswordView,
  ResetPasswordView,
  AccountView,
  resourceRouteElements,
  notificationProvider,
  Toaster,
  defaultWidgets
} from './ui'
import type { AdminNavItem, AdminBranding } from './ui'

/** A project-defined screen mounted inside the admin shell. */
export interface AdminCustomRoute {
  /** Route path (absolute, e.g. "/dashboard"). */
  path: string
  element: ReactNode
  /** Mount as the home (index) route. */
  index?: boolean
  /** Optional sidebar entry for this route. */
  nav?: Omit<AdminNavItem, 'path'>
}

export interface AdminOverrides {
  widget?: Record<string, ComponentType<any>>
  view?: Record<string, ComponentType<any>>
  action?: Record<string, ComponentType<any>>
}

/** Theme tokens — CSS variable values. Colors are HSL channels ("221 83% 53%"). */
export interface AdminThemeTokens {
  background?: string
  foreground?: string
  card?: string
  cardForeground?: string
  popover?: string
  popoverForeground?: string
  primary?: string
  primaryForeground?: string
  secondary?: string
  secondaryForeground?: string
  muted?: string
  mutedForeground?: string
  accent?: string
  accentForeground?: string
  destructive?: string
  destructiveForeground?: string
  border?: string
  input?: string
  ring?: string
  /** Any CSS length, e.g. "0.75rem". */
  radius?: string
}

export interface AdminTheme extends AdminThemeTokens {
  /** Overrides applied under the `.dark` class. */
  dark?: AdminThemeTokens
}

/**
 * A composable bundle of customizations. Drop one per concern (theme, widgets,
 * a feature's pages…) into a client app, or publish it as its own npm package
 * and share it across client repos — no fork, no monorepo.
 */
export interface AdminPlugin {
  name?: string
  widgets?: Record<string, ComponentType<any>>
  views?: Record<string, ComponentType<any>>
  actions?: Record<string, ComponentType<any>>
  routes?: AdminCustomRoute[]
  dictionaries?: Dictionaries
  theme?: AdminTheme
  branding?: AdminBranding
}

/** Identity helper for authoring typed plugins. */
export function defineAdminPlugin(plugin: AdminPlugin): AdminPlugin {
  return plugin
}

export interface VolcanicAdminProps {
  /** Backend base URL (used to fetch the manifest and mount CRUD). */
  apiUrl?: string
  authMode?: AuthMode
  /** Router basename when the admin is mounted under a sub-path. */
  basename?: string

  /** Static manifest (skips fetching). */
  manifest?: Manifest
  /** Custom manifest loader (defaults to GET ${apiUrl}/admin/manifest). */
  loadManifest?: () => Promise<Manifest>
  /** Base path for CRUD calls. Default '/admin' (generic CRUD); set '' for real hand-written routes. */
  apiBasePath?: string
  /** Project overrides merged onto the generated/fetched manifest by (resource, field). */
  manifestOverrides?: ManifestOverrides

  /** Override the data provider (e.g. an in-memory mock for development). */
  dataProvider?: DataProvider
  /** Override the auth client (e.g. a mock). */
  authClient?: AuthClient

  dictionaries?: Dictionaries
  defaultLocale?: string
  locales?: string[]

  /** Project overrides keyed by manifest componentId. */
  overrides?: AdminOverrides

  /** Theme tokens injected as CSS variables (no Tailwind needed). */
  theme?: AdminTheme

  /** Brand identity (logo + app name) shown in the sidebar header. */
  branding?: AdminBranding

  /** Composable customization bundles (widgets/views/actions/routes/i18n/theme). */
  plugins?: AdminPlugin[]

  /** Tenant list loader (multi-tenant). Defaults to GET ${apiUrl}/tenants. */
  fetchTenants?: () => Promise<TenantOption[]>

  /** Extra screens (dashboards, reports, custom pages). */
  routes?: AdminCustomRoute[]

  /** Rendered while the manifest loads. */
  loading?: ReactNode
}

const API_FALLBACK = 'http://0.0.0.0:2230'

/** Keeps the access-control role cache in sync with the logged-in user. */
function RolesSync() {
  const { data } = usePermissions<string[]>()
  rolesStore.set((data as string[] | undefined) ?? [])
  return null
}

function AdminRuntime({ model, props }: { model: AdminModel; props: VolcanicAdminProps }) {
  const { manifest } = model
  const apiUrl = props.apiUrl ?? API_FALLBACK
  const authMode: AuthMode = props.authMode ?? manifest.auth.mode

  const authClient: AuthClient = useMemo(
    () => props.authClient ?? createVolcanicAuthClient({ apiUrl, authMode }),
    [props.authClient, apiUrl, authMode]
  )

  const authProvider: AuthProvider = useMemo(
    () => createVolcanicAuthProvider({ client: authClient, authMode }),
    [authClient, authMode]
  )

  const dataProvider: DataProvider = useMemo(() => {
    if (props.dataProvider) return props.dataProvider
    const pathByName = new Map(model.resources.map((r) => [r.spec.name, r.spec.path]))
    return createVolcanicDataProvider({
      apiUrl,
      authMode,
      basePath: props.apiBasePath,
      resolvePath: (name) => pathByName.get(name) ?? name,
      getToken: () => tokenStore.get(),
      getContextHeaders: () => tenantStore.headers()
    })
  }, [props.dataProvider, props.apiBasePath, model, apiUrl, authMode])

  const accessControlProvider = useMemo(() => createVolcanicAccessControlProvider(model), [model])

  const registry = useMemo(
    () =>
      createOverrideRegistry({
        widget: { ...defaultWidgets, ...props.overrides?.widget },
        view: props.overrides?.view,
        action: props.overrides?.action
      }),
    [props.overrides]
  )

  const fetchTenants = useMemo<() => Promise<TenantOption[]>>(() => {
    if (props.fetchTenants) return props.fetchTenants
    return async () => {
      const res = await fetch(`${apiUrl}${manifest.tenancy.listEndpoint ?? '/tenants'}`, {
        credentials: authMode === 'cookie' ? 'include' : 'same-origin'
      })
      const data = await res.json()
      return (Array.isArray(data) ? data : (data?.data ?? [])).map((t: any) => ({
        id: t.id,
        name: t.name ?? t.label ?? t.id
      }))
    }
  }, [props.fetchTenants, apiUrl, authMode, manifest.tenancy.listEndpoint])

  const customRoutes = props.routes ?? []
  const navExtras: AdminNavItem[] = customRoutes
    .filter((r) => r.nav)
    .map((r) => ({ path: r.path, ...r.nav! }))
  const indexRoute = customRoutes.find((r) => r.index)

  return (
    <I18nProvider
      dictionaries={props.dictionaries ?? {}}
      defaultLocale={props.defaultLocale ?? manifest.i18n.defaultLocale}
      locales={props.locales ?? manifest.i18n.locales}
    >
      <RegistryProvider registry={registry}>
        <AuthClientProvider client={authClient}>
          <TenantProvider tenancy={manifest.tenancy} fetchTenants={fetchTenants}>
            <AdminConfigProvider navExtras={navExtras} branding={props.branding}>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                accessControlProvider={accessControlProvider}
                notificationProvider={notificationProvider}
                routerProvider={routerProvider}
                resources={toRefineResources(model)}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  disableTelemetry: true
                }}
              >
                <RolesSync />
                <Routes>
                  <Route
                    path="/login"
                    element={
                      <Authenticated key="login" fallback={<LoginView />}>
                        <NavigateToResource />
                      </Authenticated>
                    }
                  />
                  <Route path="/forgot-password" element={<ForgotPasswordView />} />
                  <Route path="/reset-password" element={<ResetPasswordView />} />
                  <Route
                    element={
                      <Authenticated key="app" fallback={<CatchAllNavigate to="/login" />}>
                        <AdminLayout />
                      </Authenticated>
                    }
                  >
                    <Route
                      index
                      element={
                        indexRoute ? <Navigate to={indexRoute.path} replace /> : <NavigateToResource />
                      }
                    />
                    <Route path="/account" element={<AccountView />} />
                    {customRoutes.map((r) => (
                      <Route key={r.path} path={r.path} element={r.element} />
                    ))}
                    {resourceRouteElements(model)}
                    <Route path="*" element={<NavigateToResource />} />
                  </Route>
                </Routes>
                <UnsavedChangesNotifier />
                <DocumentTitleHandler />
                <Toaster richColors position="top-right" />
              </Refine>
            </AdminConfigProvider>
          </TenantProvider>
        </AuthClientProvider>
      </RegistryProvider>
    </I18nProvider>
  )
}

const TOKEN_VARS: Record<string, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  popover: '--popover',
  popoverForeground: '--popover-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
  radius: '--radius'
}

function themeBlock(tokens?: AdminThemeTokens): string {
  if (!tokens) return ''
  return Object.entries(tokens)
    .filter(([k, v]) => TOKEN_VARS[k] && v != null)
    .map(([k, v]) => `${TOKEN_VARS[k]}: ${v};`)
    .join('')
}

/** Injects theme tokens as CSS variables (applies during loading too). */
function ThemeStyle({ theme }: { theme?: AdminTheme }) {
  const css = useMemo(() => {
    if (!theme) return ''
    const { dark, ...light } = theme
    const root = themeBlock(light)
    const dk = themeBlock(dark)
    return `${root ? `:root{${root}}` : ''}${dk ? `.dark{${dk}}` : ''}`
  }, [theme])
  return css ? <style>{css}</style> : null
}

function mergeDictionaries(list: (Dictionaries | undefined)[]): Dictionaries {
  const out: Dictionaries = {}
  for (const d of list) {
    if (!d) continue
    for (const [loc, map] of Object.entries(d)) out[loc] = { ...(out[loc] ?? {}), ...map }
  }
  return out
}

function mergeTheme(list: (AdminTheme | undefined)[]): AdminTheme | undefined {
  let any = false
  const out: AdminTheme = {}
  for (const t of list) {
    if (!t) continue
    any = true
    const { dark, ...rest } = t
    Object.assign(out, rest)
    if (dark) out.dark = { ...(out.dark ?? {}), ...dark }
  }
  return any ? out : undefined
}

function mergeBranding(list: (AdminBranding | undefined)[]): AdminBranding | undefined {
  let any = false
  const out: AdminBranding = {}
  for (const b of list) {
    if (!b) continue
    any = true
    Object.assign(out, b)
  }
  return any ? out : undefined
}

function mergeRecords<T>(list: (Record<string, T> | undefined)[]): Record<string, T> | undefined {
  let any = false
  const out: Record<string, T> = {}
  for (const r of list) {
    if (r) {
      any = true
      Object.assign(out, r)
    }
  }
  return any ? out : undefined
}

export function VolcanicAdmin(props: VolcanicAdminProps) {
  const apiUrl = props.apiUrl ?? API_FALLBACK
  const plugins = props.plugins ?? []

  // Compose plugins + direct props (direct props win on key collisions).
  const effective = useMemo<VolcanicAdminProps>(
    () => ({
      ...props,
      overrides: {
        widget: mergeRecords([...plugins.map((p) => p.widgets), props.overrides?.widget]),
        view: mergeRecords([...plugins.map((p) => p.views), props.overrides?.view]),
        action: mergeRecords([...plugins.map((p) => p.actions), props.overrides?.action])
      },
      routes: [...plugins.flatMap((p) => p.routes ?? []), ...(props.routes ?? [])],
      dictionaries: mergeDictionaries([...plugins.map((p) => p.dictionaries), props.dictionaries]),
      branding: mergeBranding([...plugins.map((p) => p.branding), props.branding])
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `plugins` is derived from `props`
    [props]
  )

  const theme = useMemo(
    () => mergeTheme([...plugins.map((p) => p.theme), props.theme]),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `plugins` is derived from `props`
    [props]
  )

  const load = useMemo(() => {
    if (props.manifest) return undefined
    return (
      props.loadManifest ??
      (async () => {
        const res = await fetch(`${apiUrl}/admin/manifest`, {
          credentials: 'include',
          headers: { Accept: 'application/json' }
        })
        if (!res.ok) throw new Error(`Manifest fetch failed (${res.status})`)
        return res.json() as Promise<Manifest>
      })
    )
  }, [props.manifest, props.loadManifest, apiUrl])

  return (
    <BrowserRouter basename={props.basename}>
      <ThemeStyle theme={theme} />
      <ManifestProvider
        manifest={props.manifest}
        load={load}
        overrides={props.manifestOverrides}
        fallback={props.loading}
      >
        {(model) => <AdminRuntime model={model} props={effective} />}
      </ManifestProvider>
    </BrowserRouter>
  )
}
