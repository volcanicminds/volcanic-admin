/**
 * @volcanicminds/admin — engine (headless, UI-agnostic).
 * Public surface: manifest spec types, interpreter, providers, registry, i18n.
 * The engine never imports the `ui/` layer.
 */
export * from './types/manifest.js'
export * from './types/model.js'

export { interpretManifest, toRefineResources } from './interpreter.js'
export { buildMagicQuery, readTotal } from './magic-query.js'

export { createVolcanicDataProvider } from './providers/data.js'
export type { VolcanicDataProviderOptions, AuthMode } from './providers/data.js'

export { createVolcanicAuthProvider } from './providers/auth.js'
export type { VolcanicAuthOptions } from './providers/auth.js'
export { tokenStore } from './auth/tokenStore.js'
export { createVolcanicAuthClient } from './auth/client.js'
export type {
  AuthClient,
  AuthData,
  LoginResponse,
  MfaSetup,
  VolcanicAuthClientOptions
} from './auth/client.js'
export { AuthClientProvider, useAuthClient } from './auth/context.js'

export { createVolcanicAccessControlProvider, rolesStore } from './providers/accessControl.js'

export { TenantProvider, useTenant, tenantStore } from './providers/tenant.js'
export type { TenantOption } from './providers/tenant.js'

export {
  createOverrideRegistry,
  RegistryProvider,
  useRegistry
} from './registry.js'
export type { OverrideRegistry, OverrideKind } from './registry.js'

export { I18nProvider, useI18n, useT } from './i18n.js'
export type { Dictionary, Dictionaries } from './i18n.js'

export {
  ManifestProvider,
  useModel,
  useResourceModel
} from './manifest.js'
export type { ManifestSource, ManifestProviderProps } from './manifest.js'
