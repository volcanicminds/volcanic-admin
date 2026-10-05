/**
 * Minimal, schema-shaped manifest builders shared by the engine tests. Each test states the
 * fields it cares about; everything else is the smallest valid value.
 */
import type { CapabilityKind, CapabilitySpec, Manifest, ResourceSpec } from '@/engine'

export function cap(kind: CapabilityKind, extra: Partial<CapabilitySpec> = {}): CapabilitySpec {
  const method = kind === 'create' || kind === 'action' ? 'POST' : kind === 'update' ? 'PUT' : kind === 'delete' ? 'DELETE' : 'GET'
  return { name: kind, kind, method, path: `/x/${kind}`, roles: [], ...extra }
}

export function resource(extra: Partial<ResourceSpec> & Pick<ResourceSpec, 'name'>): ResourceSpec {
  return {
    path: extra.name,
    label: { singular: `res.${extra.name}.singular`, plural: `res.${extra.name}.plural` },
    capabilities: [],
    fields: [],
    ...extra
  }
}

export function manifest(extra: Partial<Manifest> = {}): Manifest {
  return {
    version: 2,
    generatedAt: '2026-01-01T00:00:00Z',
    i18n: { defaultLocale: 'en', locales: ['en'] },
    auth: {
      mode: 'bearer',
      endpoints: { flowOptions: '/o', flowStart: '/s', flowStep: '/st', refresh: '/r', logout: '/l' }
    },
    tenancy: { mode: 'single' },
    groups: [],
    enums: {},
    resources: [],
    ...extra
  }
}
