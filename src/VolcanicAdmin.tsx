/**
 * <VolcanicAdmin> — the public root component. Mounts the whole admin from a
 * small set of props: where the backend is, how to authenticate, the i18n
 * dictionaries, and project overrides (widgets/views/actions, custom pages).
 *
 * Data source resolution:
 *   - pass `manifest` for a static manifest (dev/SSR), or `loadManifest`, or
 *     nothing → it fetches `${apiUrl}/admin/manifest` (`/system/manifest` on the
 *     control plane) with the session, and shows the login when there is none.
 *   - pass `dataProvider`/`authClient` to override (e.g. a mock), otherwise the
 *     real Volcanic providers are built from `apiUrl` + `authMode`.
 */
import { useMemo, useState, type ComponentType, type ReactNode } from 'react'
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
  createApiRequest,
  primeTenantStore,
  MANIFEST_PATH,
  tokenStore,
  tenantStore,
  rolesStore,
  toRefineResources,
  defaultDictionaries,
  deepMerge,
  useT
} from './engine'
import type {
  AdminModel,
  AuthClient,
  AuthMode,
  Dictionaries,
  Manifest,
  ManifestOverrides,
  Plane,
  TenantOption
} from './engine'
import {
  AdminLayout,
  AdminConfigProvider,
  useAdminConfig,
  LoginView,
  ForgotPasswordView,
  ResetPasswordView,
  AccountView,
  resourceRouteElements,
  notificationProvider,
  Toaster,
  defaultWidgets,
  defaultActions,
  ThemeProvider
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
  /** Default: `manifest.auth.mode`; before a manifest exists, `'cookie'`. */
  authMode?: AuthMode
  /**
   * The identity space this console works in (T-10.14). `tenant` (default): a customer's users,
   * `/auth/*`, the manifest at `/admin/manifest`. `control`: the platform's operators,
   * `/system/auth/*`, the manifest at `/system/manifest`, and never a tenant header. With tenants
   * declared a console is one or the other; without, only `tenant` exists.
   */
  plane?: Plane
  /**
   * The tenant of a console that serves one customer (T-10.15): sent in the tenant header from the
   * login on, never asked. Unset, a multi-tenant console asks for it on the login screen and
   * remembers it in this browser.
   */
  tenant?: string
  /** The tenant header before a manifest names it. Default `'x-tenant-id'`. */
  tenantHeader?: string
  /** Router basename when the admin is mounted under a sub-path. */
  basename?: string

  /** Static manifest (skips fetching). */
  manifest?: Manifest
  /** Custom manifest loader (defaults to GET ${apiUrl}/admin/manifest, or /system/manifest on the control plane). */
  loadManifest?: () => Promise<Manifest>
  /**
   * Prefix inserted between `apiUrl` and every resource path. Default `''`: the manifest's paths
   * are relative to the API root, where a v5 backend mounts its routes. Set it only when a proxy
   * publishes the API under a sub-path that `apiUrl` does not already include.
   */
  apiBasePath?: string
  /**
   * Auth endpoints that win over `manifest.auth.endpoints`, key by key (`flowStart`, `flowStep`,
   * `refresh`, `logout`, `me`, …). Unset keys follow the manifest, then the client defaults.
   */
  authEndpoints?: Partial<Record<string, string>>
  /** Project overrides merged onto the generated/fetched manifest by (resource, field). */
  manifestOverrides?: ManifestOverrides<any>

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

  /**
   * Tenant list for a switcher, where a deployment's manifest declares `tenancy.switchable`. No
   * default: on a v5 backend the token binds the tenant (T-10.15) and the list is a control route.
   */
  fetchTenants?: () => Promise<TenantOption[]>

  /** Extra screens (dashboards, reports, custom pages). */
  routes?: AdminCustomRoute[]

  /** Rendered while the manifest loads. */
  loading?: ReactNode

  /** Toast position. Default 'bottom-right' (keeps the top-right action area clear). */
  toastPosition?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
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
  const plane: Plane = props.plane ?? 'tenant'

  // The backend declares its auth routes in the manifest; a direct prop still wins per key. The
  // key is a string so that an inline `authEndpoints` object does not rebuild the client, and
  // with it the shared renewal, on every render.
  const endpointsKey = JSON.stringify({ ...manifest.auth?.endpoints, ...props.authEndpoints })
  const authClient: AuthClient = useMemo(
    () =>
      props.authClient ??
      createVolcanicAuthClient({
        apiUrl,
        authMode,
        plane,
        endpoints: JSON.parse(endpointsKey) as Record<string, string>,
        getContextHeaders: () => tenantStore.headers()
      }),
    [props.authClient, apiUrl, authMode, plane, endpointsKey]
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
      getContextHeaders: () => tenantStore.headers(),
      renewSession: () => authClient.renew?.() ?? Promise.resolve(false)
    })
  }, [props.dataProvider, props.apiBasePath, model, apiUrl, authMode, authClient])

  const accessControlProvider = useMemo(() => createVolcanicAccessControlProvider(model), [model])

  const registry = useMemo(
    () =>
      createOverrideRegistry({
        widget: { ...defaultWidgets, ...props.overrides?.widget },
        view: props.overrides?.view,
        action: { ...defaultActions, ...props.overrides?.action }
      }),
    [props.overrides]
  )

  // No default tenant list (T-10.15): the token binds the tenant from the login on, and `/tenants`
  // is a control route a customer's user can never call. The control plane declares no tenant.
  const tenancy = useMemo(() => runtimeTenancy(manifest.tenancy, plane), [manifest.tenancy, plane])

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
          <TenantProvider
            tenancy={tenancy}
            fixedTenant={plane === 'tenant' ? props.tenant : undefined}
            fetchTenants={props.fetchTenants}
          >
            <AdminConfigProvider navExtras={navExtras} branding={props.branding} plane={plane}>
              <Refine
                dataProvider={dataProvider}
                authProvider={authProvider}
                accessControlProvider={accessControlProvider}
                notificationProvider={notificationProvider}
                routerProvider={routerProvider}
                resources={toRefineResources(model)}
                options={{
                  syncWithLocation: true,
                  // Unsaved-changes warnings are handled by AutoForm's
                  // UnsavedChangesGuard (a styled modal), not refine's native prompt.
                  warnWhenUnsavedChanges: false,
                  disableTelemetry: true,
                  // Edits/deletes apply instantly and roll back on error.
                  mutationMode: 'optimistic'
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
                <VolcanicDocumentTitle />
                <Toaster richColors closeButton position={props.toastPosition ?? 'bottom-right'} />
              </Refine>
            </AdminConfigProvider>
          </TenantProvider>
        </AuthClientProvider>
      </RegistryProvider>
    </I18nProvider>
  )
}

/**
 * Sets `document.title` for every route. Replaces refine's default handler,
 * which leaks the raw i18n label key (e.g. "res.vehicle.plural") and a hard
 * "| Refine" suffix. We translate the resource label through the engine's own
 * dictionaries and suffix with the project's app name.
 *
 * This handler only knows the resource + action (no record), so it produces the
 * collection/create titles and a plain single-item fallback. Detail pages
 * (show/edit/singleton) refine `document.title` to include record fields via
 * `useRecordDocumentTitle` once the record loads — e.g. "Veicolo BMW 320".
 *
 * Format: `[<action prefix>] <label> · <appName>` — e.g. "Veicoli · Dionisi",
 * "Nuovo Veicolo · Dionisi", "Veicolo · Dionisi" (before the record loads).
 */
function VolcanicDocumentTitle() {
  const t = useT()
  const { branding } = useAdminConfig()
  const appName = branding?.appName ?? 'Volcanic Admin'
  return (
    <DocumentTitleHandler
      handler={({ resource, action }) => {
        const meta = resource?.meta as { label?: string; labelSingular?: string } | undefined
        // Single-item views use the singular label; the collection uses the plural.
        const perItem = action === 'create' || action === 'edit' || action === 'clone' || action === 'show'
        const rawLabel =
          (perItem ? meta?.labelSingular : undefined) ??
          meta?.label ??
          (resource?.label as string | undefined)
        const label = rawLabel ? t(rawLabel) : ''
        if (!label) return appName

        // Only create/clone carry an action prefix here. edit/show get their final
        // title (with record fields) from the view, so a prefix would flash then
        // vanish — we leave them as the plain singular label as a pre-load fallback.
        const prefix = action === 'create' || action === 'clone' ? t('docTitle.create') : ''
        const head = [prefix, label].filter(Boolean).join(' ')
        return `${head} · ${appName}`
      }}
    />
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

/**
 * What this console knows about the framework's own control plane and the backend does not say.
 *
 * Destroying a container is two calls tied together (backend T-10.21), so its capability needs a
 * component instead of the generic dialog. The pointer lives here and not in the manifest because
 * naming a component is presentation, and the backend describes only the calls, their bodies and
 * the capability that gates them. A project's own overrides are merged on top, so the same
 * capability can still be pointed somewhere else.
 */
const CONTROL_BUILTIN_OVERRIDES: ManifestOverrides = {
  resources: {
    tenant: { capabilities: { data: { component: 'tenant-destroy' } } },
    // An operator's roles are a text array, and a JSON Schema cannot tell that apart from any
    // other array: the backend types it `json`, json is too heavy to put in a table, and so the
    // one column that says what an operator is allowed to do was the one missing from the list.
    // Read as an enum it becomes one badge per code. The codes stay unlabelled on purpose:
    // `system:admin` is the name of the thing, not a key to translate.
    systemUser: { fields: { roles: { type: 'enum' } } }
  }
}

export function VolcanicAdmin(props: VolcanicAdminProps) {
  const apiUrl = props.apiUrl ?? API_FALLBACK
  const plugins = props.plugins ?? []
  const plane: Plane = props.plane ?? 'tenant'

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
      dictionaries: mergeDictionaries([
        defaultDictionaries,
        ...plugins.map((p) => p.dictionaries),
        props.dictionaries
      ]),
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

  // Before a manifest there is no `auth` block to read: the props say how to authenticate, and
  // cookie is the backend default (T-10.37). The tenant header is set now, because a multi-tenant
  // manifest is read inside a tenant.
  //
  // The default is a guess, and on the control plane it cannot be checked before logging in:
  // `/system/manifest` needs the session it is supposed to describe. So the login corrects it. A
  // backend that answers with a token is a bearer deployment, and the console adopts that for the
  // requests it makes next, the manifest included. Without this, a bearer deployment logged the
  // operator in and bounced them straight back to the login screen (found live, T-10.20).
  // Seeded from the store, so the correction survives a reload: a console in cookie mode never
  // holds a token (the provider clears the store when it builds), so finding one is evidence that
  // this deployment is bearer. Without this the operator logged in, hit refresh, and landed back
  // on the login screen with a perfectly good session sitting in the page.
  const [detectedAuthMode, setDetectedAuthMode] = useState<AuthMode | undefined>(() =>
    tokenStore.get() ? 'bearer' : undefined
  )
  const bootAuthMode: AuthMode = props.authMode ?? detectedAuthMode ?? 'cookie'
  const bootEndpointsKey = JSON.stringify(props.authEndpoints ?? {})
  primeTenantStore({ plane, tenant: props.tenant, header: props.tenantHeader })

  const bootClient: AuthClient = useMemo(
    () =>
      props.authClient ??
      createVolcanicAuthClient({
        apiUrl,
        authMode: bootAuthMode,
        plane,
        endpoints: JSON.parse(bootEndpointsKey) as Record<string, string>,
        getContextHeaders: () => tenantStore.headers()
      }),
    [props.authClient, apiUrl, bootAuthMode, plane, bootEndpointsKey]
  )

  const load = useMemo(() => {
    if (props.manifest) return undefined
    if (props.loadManifest) return props.loadManifest
    // T-10.12: the manifest request authenticates exactly as a data request does, renewal included.
    const request = createApiRequest({
      authMode: bootAuthMode,
      getToken: () => tokenStore.get(),
      getContextHeaders: () => tenantStore.headers(),
      renewSession: () => bootClient.renew?.() ?? Promise.resolve(false)
    })
    return async () => {
      const res = await request(`${apiUrl}${MANIFEST_PATH[plane]}`, { headers: { Accept: 'application/json' } })
      if (!res.ok) throw await manifestLoadError(res)
      return (await res.json()) as Manifest
    }
  }, [props.manifest, props.loadManifest, apiUrl, bootAuthMode, plane, bootClient])

  // The built-ins first, the project's own on top: a console that could not repoint one of them
  // would be a framework decision a project has no way out of.
  const manifestOverrides = useMemo(
    () =>
      plane === 'control'
        ? (deepMerge(CONTROL_BUILTIN_OVERRIDES, props.manifestOverrides ?? {}) as ManifestOverrides)
        : props.manifestOverrides,
    [plane, props.manifestOverrides]
  )

  return (
    <BrowserRouter basename={props.basename}>
      <ThemeProvider>
        <ThemeStyle theme={theme} />
        <ManifestProvider
          manifest={props.manifest}
          load={load}
          overrides={manifestOverrides}
          fallback={props.loading}
          renderError={(error, retry) =>
            needsLogin(error) ? (
              <BootstrapLogin
                client={bootClient}
                authMode={bootAuthMode}
                plane={plane}
                branding={effective.branding}
                dictionaries={effective.dictionaries ?? {}}
                defaultLocale={effective.defaultLocale ?? BOOT_LOCALE}
                locales={effective.locales ?? [BOOT_LOCALE]}
                tenancy={bootTenancy(plane, error, props.tenantHeader)}
                fixedTenant={plane === 'tenant' ? props.tenant : undefined}
                onAuthenticated={retry}
                onModeDetected={setDetectedAuthMode}
              />
            ) : (
              <ManifestFailure message={error.message} />
            )
          }
        >
          {(model) =>
            model.manifest.auth?.plane && model.manifest.auth.plane !== plane ? (
              // A pinned manifest of the other plane would draw screens whose every call is refused.
              <ManifestFailure
                message={`This console works on the ${plane} plane and the manifest describes the ${model.manifest.auth.plane} plane: set \`plane\` to match, or load the other manifest.`}
              />
            ) : (
              <AdminRuntime model={model} props={effective} />
            )
          }
        </ManifestProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}

/** A failed manifest load, with what the backend said: the status and the machine `code`. */
interface LoadFailure extends Error {
  status?: number
  code?: string
}

async function manifestLoadError(res: Response): Promise<LoadFailure> {
  let code: string | undefined
  try {
    const body = await res.json()
    if (typeof body?.code === 'string') code = body.code
  } catch {
    /* not json */
  }
  return Object.assign(new Error(`Manifest fetch failed (${res.status}${code ? ` ${code}` : ''})`), {
    status: res.status,
    code
  })
}

/**
 * Whether a failed manifest load is a session to open rather than an error to show (T-10.12): no
 * session (401), no tenant declared yet (`TENANT_REQUIRED`), a remembered tenant that does not
 * exist (`TENANT_NOT_FOUND`), or a session of the other plane (`SCOPE_MISMATCH`). The login screen
 * answers all four, and the error page none.
 */
function needsLogin(error: LoadFailure): boolean {
  return error.status === 401 || ['TENANT_REQUIRED', 'TENANT_NOT_FOUND', 'SCOPE_MISMATCH'].includes(error.code ?? '')
}

/**
 * The tenancy the login needs before a manifest describes it. A tenant is asked only where the
 * backend showed it needs one, or where one is remembered or fixed; the control plane never.
 */
function bootTenancy(plane: Plane, error: LoadFailure, header?: string): Manifest['tenancy'] {
  if (plane === 'control') return { mode: 'single' }
  const needsTenant = error.code === 'TENANT_REQUIRED' || error.code === 'TENANT_NOT_FOUND' || Boolean(tenantStore.id)
  return needsTenant ? { mode: 'multi', switchable: false, header: header ?? 'x-tenant-id' } : { mode: 'single' }
}

/** The manifest's tenancy as this console must apply it: the control plane declares no tenant. */
function runtimeTenancy(tenancy: Manifest['tenancy'], plane: Plane): Manifest['tenancy'] {
  return plane === 'control' ? { mode: tenancy.mode, switchable: false } : tenancy
}

/** The language of the login a console draws before a manifest names one. */
const BOOT_LOCALE = 'en'

function ManifestFailure({ message }: { message: string }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', color: '#b91c1c' }}>
      <strong>Manifest error:</strong> {message}
    </div>
  )
}

/**
 * The login a console needs before it has a manifest (T-10.12). The manifest is read with the
 * session, so a first visit, an expired session or a console that has not named its tenant yet
 * lands here instead of on an error page. A completed login loads the manifest again, and the
 * admin behind it appears where the user already is.
 */
function BootstrapLogin({
  client,
  authMode,
  plane,
  branding,
  dictionaries,
  defaultLocale,
  locales,
  tenancy,
  fixedTenant,
  onAuthenticated,
  onModeDetected
}: {
  client: AuthClient
  authMode: AuthMode
  plane: Plane
  branding?: AdminBranding
  dictionaries: Dictionaries
  defaultLocale: string
  locales: string[]
  tenancy: Manifest['tenancy']
  fixedTenant?: string
  onAuthenticated: () => void
  /** The login found the deployment to be bearer, whatever this console assumed. */
  onModeDetected?: (mode: AuthMode) => void
}) {
  const authProvider: AuthProvider = useMemo(() => {
    const base = createVolcanicAuthProvider({
      client,
      authMode,
      onBearerDetected: () => onModeDetected?.('bearer')
    })
    return {
      ...base,
      login: async (params: unknown) => {
        const result = (await base.login(params)) as Awaited<ReturnType<AuthProvider['login']>> & {
          pending?: unknown
        }
        // A stage still owed is not a session: the login screen draws it.
        if (!result.success || result.pending) return result
        onAuthenticated()
        // No navigation: the screens it would lead to exist once the manifest does.
        return { success: true }
      },
      // Nobody is authenticated in this tree: it exists to open a session.
      check: async () => ({ authenticated: false })
    }
  }, [client, authMode, onAuthenticated, onModeDetected])

  // No manifest names a language yet: the console's own, and the project's dictionaries on top.
  return (
    <I18nProvider dictionaries={dictionaries} defaultLocale={defaultLocale} locales={locales}>
      <AuthClientProvider client={client}>
        <TenantProvider tenancy={tenancy} fixedTenant={fixedTenant}>
          <AdminConfigProvider branding={branding} plane={plane}>
            <Refine
              authProvider={authProvider}
              routerProvider={routerProvider}
              notificationProvider={notificationProvider}
              options={{ disableTelemetry: true }}
            >
              <Routes>
                {plane === 'tenant' && <Route path="/forgot-password" element={<ForgotPasswordView />} />}
                {plane === 'tenant' && <Route path="/reset-password" element={<ResetPasswordView />} />}
                <Route path="*" element={<LoginView />} />
              </Routes>
              <Toaster richColors closeButton position="bottom-right" />
            </Refine>
          </AdminConfigProvider>
        </TenantProvider>
      </AuthClientProvider>
    </I18nProvider>
  )
}
