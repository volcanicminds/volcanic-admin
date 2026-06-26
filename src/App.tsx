/**
 * Application wiring — assembles the engine providers + Refine + router and
 * mounts the generated routes. Data source switches between the in-memory mock
 * and the real Volcanic backend via VITE_ADMIN_SOURCE.
 */
import { useEffect, useMemo } from 'react'
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
  tokenStore,
  tenantStore,
  rolesStore,
  toRefineResources
} from '@/engine'
import type { AdminModel, Manifest, TenantOption } from '@/engine'
import {
  AdminLayout,
  LoginView,
  resourceRouteElements,
  notificationProvider,
  Toaster,
  defaultWidgets
} from '@/ui'

import { mockManifest } from '@/mock/manifest'
import { mockDataProvider } from '@/mock/mockDataProvider'
import { mockAuthProvider } from '@/mock/mockAuthProvider'
import { mockDictionaries } from '@/mock/i18n'
import { mockTenants } from '@/mock/data'

const API_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://0.0.0.0:2230'
const SOURCE = import.meta.env.VITE_ADMIN_SOURCE ?? 'mock'
const IS_MOCK = SOURCE !== 'rest'

/** Keeps the access-control role cache in sync with the logged-in user. */
function RolesSync() {
  const { data } = usePermissions<string[]>()
  useEffect(() => {
    rolesStore.set((data as string[] | undefined) ?? [])
  }, [data])
  return null
}

function RefineApp({ model }: { model: AdminModel }) {
  const { manifest } = model

  const dataProvider: DataProvider = useMemo(() => {
    if (IS_MOCK) return mockDataProvider
    const pathByName = new Map(model.resources.map((r) => [r.spec.name, r.spec.path]))
    return createVolcanicDataProvider({
      apiUrl: API_URL,
      authMode: manifest.auth.mode,
      resolvePath: (name) => pathByName.get(name) ?? name,
      getToken: () => tokenStore.get(),
      getContextHeaders: () => tenantStore.headers()
    })
  }, [model, manifest.auth.mode])

  const authProvider: AuthProvider = useMemo(
    () =>
      IS_MOCK
        ? mockAuthProvider
        : createVolcanicAuthProvider({ apiUrl: API_URL, authMode: manifest.auth.mode }),
    [manifest.auth.mode]
  )

  const accessControlProvider = useMemo(() => createVolcanicAccessControlProvider(model), [model])

  const registry = useMemo(() => createOverrideRegistry({ widget: defaultWidgets }), [])

  const fetchTenants = useMemo<() => Promise<TenantOption[]>>(
    () =>
      IS_MOCK
        ? async () => mockTenants
        : async () => {
            const res = await fetch(`${API_URL}${manifest.tenancy.listEndpoint ?? '/tenants'}`, {
              credentials: manifest.auth.mode === 'cookie' ? 'include' : 'same-origin'
            })
            const data = await res.json()
            return (Array.isArray(data) ? data : data?.data ?? []).map((t: any) => ({
              id: t.id,
              name: t.name ?? t.label ?? t.id
            }))
          },
    [manifest.tenancy.listEndpoint, manifest.auth.mode]
  )

  return (
    <I18nProvider
      dictionaries={IS_MOCK ? mockDictionaries : {}}
      defaultLocale={manifest.i18n.defaultLocale}
      locales={manifest.i18n.locales}
    >
      <RegistryProvider registry={registry}>
        <TenantProvider tenancy={manifest.tenancy} fetchTenants={fetchTenants}>
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
                element={
                  <Authenticated key="authenticated" fallback={<CatchAllNavigate to="/login" />}>
                    <AdminLayout />
                  </Authenticated>
                }
              >
                <Route index element={<NavigateToResource />} />
                {resourceRouteElements(model)}
                <Route path="*" element={<NavigateToResource />} />
              </Route>
              <Route
                element={
                  <Authenticated key="auth-pages" fallback={<LoginView />}>
                    <NavigateToResource />
                  </Authenticated>
                }
              >
                <Route path="/login" element={<LoginView />} />
              </Route>
            </Routes>
            <UnsavedChangesNotifier />
            <DocumentTitleHandler />
            <Toaster richColors position="top-right" />
          </Refine>
        </TenantProvider>
      </RegistryProvider>
    </I18nProvider>
  )
}

async function loadRemoteManifest(): Promise<Manifest> {
  const res = await fetch(`${API_URL}/admin/manifest`, {
    credentials: 'include',
    headers: { Accept: 'application/json' }
  })
  if (!res.ok) throw new Error(`Manifest fetch failed (${res.status})`)
  return res.json()
}

export default function App() {
  return (
    <BrowserRouter>
      <ManifestProvider
        manifest={IS_MOCK ? mockManifest : undefined}
        load={IS_MOCK ? undefined : loadRemoteManifest}
      >
        {(model) => <RefineApp model={model} />}
      </ManifestProvider>
    </BrowserRouter>
  )
}
