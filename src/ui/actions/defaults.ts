/**
 * Action components the engine ships with, registered under the ids the manifest references.
 *
 * Same shape as `defaultWidgets`: seeded into the registry first, so a project that registers
 * the same id replaces it. These exist because some flows of the framework's OWN control plane
 * are more than one call, and a generic dialog cannot express them.
 */
import type { ComponentType } from 'react'
import { TenantDestroy } from './TenantDestroy'

export const defaultActions: Record<string, ComponentType<any>> = {
  'tenant-destroy': TenantDestroy
}
