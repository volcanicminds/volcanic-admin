import type { ManifestOverrides } from '@volcanicminds/admin'

/**
 * Client-owned presentation layer, merged onto the pulled `manifest.generated.ts` by
 * (resource, field). Plugins (theme/widgets/views/pages) cover React customization; this
 * file covers the manifest-level overrides (labels, groups, layouts, widget ids).
 * See docs/CONSUMING.md §1 + §3.
 */
export const overrides: ManifestOverrides = {
  excludeResources: ['token', 'health'],
  groups: [
    { name: 'catalog', label: 'group.catalog', icon: 'car', order: 10 },
    { name: 'settings', label: 'group.settings', icon: 'cog', order: 90 }
  ],
  resources: {
    vehicle: {
      titleField: 'name',
      defaultListLayout: 'card',
      fields: {
        // bind the field to the custom widget registered by catalog.plugin.tsx
        score: { type: 'integer', form: { widget: 'rating' } },
        // enrich the thin schema-only relation + hide the raw FK
        brand: { type: 'relation', relation: { resource: 'brand', titleField: 'name' }, form: { widget: 'reference-select' } },
        brandId: { list: { visible: false }, form: { visible: false } }
      },
      // render the custom show screen registered by catalog.plugin.tsx
      views: { show: 'vehicle-show' }
    }
  }
}
