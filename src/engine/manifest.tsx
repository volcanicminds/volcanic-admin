/**
 * Manifest loading + model context. Fetches `GET /admin/manifest` (already
 * role-filtered + cached server-side), interprets it into an AdminModel, and
 * exposes it to the tree. A pre-loaded manifest can be injected (mock/dev).
 */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from 'react'
import type { Manifest } from './types/manifest.js'
import type { AdminModel, ResourceModel } from './types/model.js'
import { interpretManifest } from './interpreter.js'

const ModelContext = createContext<AdminModel | null>(null)

export function useModel(): AdminModel {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel must be used within a ManifestProvider')
  return ctx
}

export function useResourceModel(name: string): ResourceModel {
  const model = useModel()
  const res = model.resource(name)
  if (!res) throw new Error(`Resource "${name}" not found in manifest`)
  return res
}

export interface ManifestSource {
  /** Pre-loaded manifest (mock/SSR). When set, no fetch is performed. */
  manifest?: Manifest
  /** Loader for runtime fetch (e.g. GET /admin/manifest). */
  load?: () => Promise<Manifest>
}

export interface ManifestProviderProps extends ManifestSource {
  children: (model: AdminModel) => ReactNode
  fallback?: ReactNode
  renderError?: (error: Error) => ReactNode
}

export function ManifestProvider({
  manifest,
  load,
  children,
  fallback,
  renderError
}: ManifestProviderProps) {
  const [model, setModel] = useState<AdminModel | null>(
    manifest ? interpretManifest(manifest) : null
  )
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (manifest || !load) return
    let cancelled = false
    load()
      .then((m) => !cancelled && setModel(interpretManifest(m)))
      .catch((e) => !cancelled && setError(e instanceof Error ? e : new Error(String(e))))
    return () => {
      cancelled = true
    }
  }, [manifest, load])

  if (error) return <>{renderError ? renderError(error) : <DefaultError error={error} />}</>
  if (!model) return <>{fallback ?? <DefaultLoading />}</>

  return <ModelContext.Provider value={model}>{children(model)}</ModelContext.Provider>
}

function DefaultLoading() {
  return <div style={{ padding: 24, fontFamily: 'system-ui' }}>Loading manifest…</div>
}

function DefaultError({ error }: { error: Error }) {
  return (
    <div style={{ padding: 24, fontFamily: 'system-ui', color: '#b91c1c' }}>
      <strong>Manifest error:</strong> {error.message}
    </div>
  )
}
