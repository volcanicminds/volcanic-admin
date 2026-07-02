import type { ManifestOverrides } from '@/engine'

/**
 * Demo project overrides — the reference example of the generated/overrides split.
 * The (data-only) generated manifest is enriched here with ALL presentation &
 * ordering: field intrinsics (filterable/sortable), the collection view (table
 * columns + card slots) and the form view (ordered groups). Everything is applied
 * on top by (resource, field) identity, so it survives a regeneration.
 */
export const mockOverrides: ManifestOverrides = {
  cardDefaults: { cardMinWidth: 240, cardMaxWidth: 340 },
  resources: {
    brand: {
      fields: {
        name: { sortable: true },
        createdAt: { sortable: true }
      },
      list: {
        layouts: ['table', 'card'],
        defaultLayout: 'card',
        sort: ['name', 'createdAt'],
        table: { columns: [{ field: 'name' }, { field: 'createdAt' }] },
        card: { align: 'center', image: 'logoUrl', title: 'name' }
      },
      form: {
        columns: 2,
        groups: [{ name: 'default', fields: [{ field: 'name' }, { field: 'logoUrl', widget: 'image-single' }] }]
      }
    },

    vehicle: {
      fields: {
        status: { filterable: true, operators: ['eq', 'in'] },
        visible: { filterable: true },
        importance: { sortable: true, filterable: true, operators: ['ge', 'le'] },
        brand: { filterable: true, operators: ['eq', 'in'] },
        name: { sortable: true },
        monthlyVatExcl: { sortable: true, filterable: true, operators: ['ge', 'le', 'between'] }
      },
      list: {
        layouts: ['table', 'card'],
        defaultLayout: 'card',
        sort: ['importance', 'monthlyVatExcl', 'brand', 'name'],
        table: {
          columns: [
            { field: 'status' },
            { field: 'visible' },
            { field: 'featured' },
            { field: 'importance' },
            { field: 'brand' },
            { field: 'name' },
            { field: 'trimLevel' },
            { field: 'monthlyVatExcl', align: 'right' }
          ]
        },
        card: {
          minWidth: 220,
          maxWidth: 300,
          highlight: 'featured',
          image: 'images',
          title: 'name',
          subtitle: 'trimLevel',
          badges: ['status'],
          body: [{ field: 'monthlyVatExcl' }, { field: 'months' }, { field: 'km' }]
        }
      },
      form: {
        columns: 2,
        groups: [
          {
            name: 'header',
            fields: [
              { field: 'status', widget: 'select' },
              { field: 'visible' },
              { field: 'featured' },
              { field: 'importance' },
              { field: 'brand', widget: 'reference-select' },
              { field: 'name', colSpan: 2 },
              { field: 'trimLevel' },
              { field: 'tag' },
              { field: 'description', widget: 'rich-text', colSpan: 2 }
            ]
          },
          {
            name: 'features',
            fields: [
              { field: 'engine' },
              { field: 'category' },
              { field: 'gearbox' },
              { field: 'doors' },
              { field: 'seats' },
              { field: 'optional', colSpan: 2 }
            ]
          },
          {
            name: 'services',
            fields: [{ field: 'svcKasko' }, { field: 'svcMaintenance' }, { field: 'svcRca' }, { field: 'svcRoadside' }]
          },
          {
            name: 'contract',
            fields: [{ field: 'monthlyVatExcl' }, { field: 'months' }, { field: 'km' }, { field: 'readyDelivery' }]
          },
          {
            name: 'images',
            fields: [{ field: 'images', widget: 'gallery-reorder', colSpan: 2 }]
          }
        ]
      }
    },

    newsletter: {
      fields: {
        email: { sortable: true },
        subscribedAt: { sortable: true, operators: ['ge', 'le', 'between'] }
      },
      list: {
        layouts: ['table', 'card'],
        defaultLayout: 'table',
        sort: ['subscribedAt', 'email'],
        table: { columns: [{ field: 'email' }, { field: 'subscribedAt' }, { field: 'privacyAccepted' }] },
        card: { title: 'email', body: [{ field: 'subscribedAt' }, { field: 'privacyAccepted' }] }
      },
      form: {
        groups: [{ name: 'default', fields: [{ field: 'email' }, { field: 'privacyAccepted' }] }]
      }
    },

    user: {
      fields: {
        firstName: { sortable: true },
        lastName: { sortable: true },
        email: { sortable: true },
        role: { filterable: true, operators: ['eq', 'in'] }
      },
      list: {
        layouts: ['table', 'card'],
        defaultLayout: 'table',
        sort: ['firstName', 'lastName', 'email'],
        table: {
          columns: [
            { field: 'firstName' },
            { field: 'lastName' },
            { field: 'email' },
            { field: 'username' },
            { field: 'role' },
            { field: 'blocked' },
            { field: 'createdAt' }
          ]
        },
        card: { title: ['firstName', 'lastName'], subtitle: 'email', badges: ['role'] }
      },
      form: {
        columns: 2,
        groups: [
          { name: 'profile', fields: [{ field: 'firstName' }, { field: 'lastName' }, { field: 'email' }, { field: 'username' }] },
          {
            name: 'access',
            fields: [
              { field: 'role', widget: 'select' },
              { field: 'blocked' },
              { field: 'password', widget: 'password', placeholder: 'field.user.password.ph', visibleOn: 'create' }
            ]
          }
        ]
      }
    },

    company: {
      form: {
        columns: 2,
        groups: [
          { name: 'company', fields: [{ field: 'legalName', colSpan: 2 }, { field: 'vatNumber' }, { field: 'taxCode' }] },
          {
            name: 'site',
            fields: [
              { field: 'address', colSpan: 2 },
              { field: 'city' },
              { field: 'province' },
              { field: 'zip' },
              { field: 'phone' },
              { field: 'email' }
            ]
          },
          { name: 'social', fields: [{ field: 'website' }, { field: 'facebook' }, { field: 'instagram' }, { field: 'linkedin' }] }
        ]
      }
    }
  }
  // e.g. excludeResources: ['user']  // would drop "Operatori" from the sidebar
}
