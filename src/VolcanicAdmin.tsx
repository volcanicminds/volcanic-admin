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
import { BrowserRouter, Routes, Route } from 'react-router'

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
import type { AdminNavItem } from './ui'

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

  /** Override the data provider (e.g. an in-memory mock for development). */
  dataProvider?: DataProvider
  /** Override the auth client (e.g. a mock). */
  authClient?: AuthClient

  dictionaries?: Dictionaries
  defaultLocale?: string
  locales?: string[]

  /** Project overrides keyed by manifest componentId. */
  overrides?: AdminOverrides

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
      resolvePath: (name) => pathByName.get(name) ?? name,
      getToken: () => tokenStore.get(),
      getContextHeaders: () => tenantStore.headers()
    })
  }, [props.dataProvider, model, apiUrl, authMode])

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
            <AdminConfigProvider navExtras={navExtras}>
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
                    <Route index element={indexRoute?.element ?? <NavigateToResource />} />
                    <Route path="/account" element={<AccountView />} />
                    {customRoutes
                      .filter((r) => !r.index)
                      .map((r) => (
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

export function VolcanicAdmin(props: VolcanicAdminProps) {
  const apiUrl = props.apiUrl ?? API_FALLBACK
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
      <ManifestProvider manifest={props.manifest} load={load} fallback={props.loading}>
        {(model) => <AdminRuntime model={model} props={props} />}
      </ManifestProvider>
    </BrowserRouter>
  )
}
