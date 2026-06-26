/**
 * Override registry — maps a `componentId` (referenced by the manifest) to a
 * project-supplied React component. Covers the three coarser override levels:
 * field widgets, action components, and full views. Where no override exists,
 * the UI falls back to its generated default.
 */
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'

/** Kinds of override slots a manifest can reference. */
export type OverrideKind = 'widget' | 'view' | 'action'

export interface OverrideRegistry {
  register(kind: OverrideKind, id: string, component: ComponentType<any>): void
  resolve(kind: OverrideKind, id?: string | null): ComponentType<any> | undefined
}

export function createOverrideRegistry(
  initial?: Partial<Record<OverrideKind, Record<string, ComponentType<any>>>>
): OverrideRegistry {
  const store: Record<OverrideKind, Map<string, ComponentType<any>>> = {
    widget: new Map(Object.entries(initial?.widget ?? {})),
    view: new Map(Object.entries(initial?.view ?? {})),
    action: new Map(Object.entries(initial?.action ?? {}))
  }
  return {
    register(kind, id, component) {
      store[kind].set(id, component)
    },
    resolve(kind, id) {
      if (!id || id === 'auto') return undefined
      return store[kind].get(id)
    }
  }
}

const RegistryContext = createContext<OverrideRegistry | null>(null)

export function RegistryProvider({
  registry,
  children
}: {
  registry: OverrideRegistry
  children: ReactNode
}) {
  return <RegistryContext.Provider value={registry}>{children}</RegistryContext.Provider>
}

export function useRegistry(): OverrideRegistry {
  const ctx = useContext(RegistryContext)
  if (!ctx) throw new Error('useRegistry must be used within a RegistryProvider')
  return ctx
}
