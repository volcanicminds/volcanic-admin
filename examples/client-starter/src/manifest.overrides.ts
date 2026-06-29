import type { ManifestOverrides } from '@volcanicminds/admin'

/**
 * Your only manifest source-of-truth. `manifest.generated.ts` is pulled from the backend
 * (`npm run pull:manifest`) and never edited; this layer is merged on top by (resource, field).
 * See docs/CONSUMING.md §1.
 */
export const overrides: ManifestOverrides = {
  // Keep framework-internal resources on the backend, just hide them from the panel.
  excludeResources: ['token', 'health'],

  // Sidebar groups: presentation only (label/icon/order) for backend-declared group names.
  groups: [{ name: 'catalog', label: 'group.catalog', icon: 'box', order: 10 }]

  // resources: { vehicle: { titleField: 'name', fields: { … } } }
}
