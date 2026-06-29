import type { ManifestOverrides } from '@/engine'

/**
 * Demo project overrides — proves the generated/overrides merge (ADM-3): patches
 * are applied on top of the (mock) generated manifest by `(resource, field)`
 * identity, so they survive a regeneration of the manifest.
 */
export const mockOverrides: ManifestOverrides = {
  resources: {
    vehicle: {
      fields: {
        // Hide the "Tag" column from the vehicle list (present in the generated manifest).
        tag: { list: { visible: false } },
        // A schema-only BE emits the brand relation "thin"; overrides fill kind/foreignKey
        // here (a no-op on the already-rich mock, but the canonical use-case).
        brand: { relation: { kind: 'many-to-one', foreignKey: 'brandId' } }
      }
    }
  }
  // e.g. excludeResources: ['user']  // would drop "Operatori" from the sidebar
}
