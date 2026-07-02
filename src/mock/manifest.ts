/**
 * Mock manifest modelled on the Dionisi Rent & Service backoffice
 * (BACKOFFICE_BLUEPRINT.md). This mirrors what the BE emits: pure DATA + STRUCTURE
 * (fields = name/type/enum/validation/relation/image, capabilities, search,
 * defaultSort) — NO presentation. All presentation & ordering (table columns, card
 * slots, form groups, filterable/sortable) lives in `mock/overrides.ts`, merged on
 * top by (resource, field) identity — exactly the generated/overrides split.
 */
import type { Manifest } from '@/engine'

export const mockManifest: Manifest = {
  version: 2,
  generatedAt: '2026-06-26T10:00:00Z',
  i18n: { defaultLocale: 'it', locales: ['it', 'en'] },
  auth: {
    mode: 'bearer',
    endpoints: { login: '/auth/login', refresh: '/auth/refresh-token', logout: '/auth/logout' }
  },
  tenancy: {
    mode: 'multi',
    switchable: true,
    header: 'x-tenant-id',
    listEndpoint: '/tenants'
  },
  groups: [
    { name: 'catalog', label: 'group.catalog', icon: 'layers', order: 10 },
    { name: 'crm', label: 'group.crm', icon: 'users', order: 20 },
    { name: 'settings', label: 'group.settings', icon: 'cog', order: 90 }
  ],
  enums: {
    vehicleStatus: [
      { value: 'draft', label: 'enum.vehicleStatus.draft', color: '#9ca3af' },
      { value: 'published', label: 'enum.vehicleStatus.published', color: '#22c55e' },
      { value: 'archived', label: 'enum.vehicleStatus.archived', color: '#f59e0b' }
    ],
    engineType: [
      { value: 'petrol', label: 'enum.engineType.petrol' },
      { value: 'diesel', label: 'enum.engineType.diesel' },
      { value: 'hybrid', label: 'enum.engineType.hybrid' },
      { value: 'electric', label: 'enum.engineType.electric' }
    ],
    vehicleCategory: [
      { value: 'city_car', label: 'enum.vehicleCategory.city_car' },
      { value: 'sedan', label: 'enum.vehicleCategory.sedan' },
      { value: 'station_wagon', label: 'enum.vehicleCategory.station_wagon' },
      { value: 'suv_crossover', label: 'enum.vehicleCategory.suv_crossover' },
      { value: 'commercial', label: 'enum.vehicleCategory.commercial' }
    ],
    gearboxType: [
      { value: 'manual', label: 'enum.gearboxType.manual' },
      { value: 'automatic', label: 'enum.gearboxType.automatic' }
    ],
    userRole: [
      { value: 'admin', label: 'enum.userRole.admin', color: '#6366f1' },
      { value: 'editor', label: 'enum.userRole.editor', color: '#22c55e' },
      { value: 'viewer', label: 'enum.userRole.viewer', color: '#9ca3af' }
    ]
  },
  resources: [
    {
      name: 'brand',
      path: 'brands',
      label: { singular: 'res.brand.singular', plural: 'res.brand.plural' },
      icon: 'tag',
      group: 'catalog',
      order: 5,
      titleField: 'name',
      tenantScoped: false,
      capabilities: [
        { name: 'list',   kind: 'list',   method: 'GET',    path: '/brands',     roles: ['admin'] },
        { name: 'read',   kind: 'read',   method: 'GET',    path: '/brands/:id', roles: ['admin'] },
        { name: 'create', kind: 'create', method: 'POST',   path: '/brands',     roles: ['admin'] },
        { name: 'update', kind: 'update', method: 'PUT',    path: '/brands/:id', roles: ['admin'] },
        { name: 'delete', kind: 'delete', method: 'DELETE', path: '/brands/:id', roles: ['admin'] }
      ],
      defaultSort: [{ field: 'name', order: 'asc' }],
      search: { fields: ['name'], operator: 'containsi' },
      fields: [
        { name: 'name', type: 'string', required: true },
        {
          name: 'logoUrl',
          type: 'image',
          image: { multiple: false, accept: ['image/png', 'image/jpeg', 'image/webp'], maxSize: 5242880, storage: 'folder' }
        },
        { name: 'createdAt', type: 'datetime', readOnly: true }
      ],
      views: { list: 'auto', create: 'auto', edit: 'auto', show: 'auto' }
    },
    {
      name: 'vehicle',
      path: 'vehicles',
      label: { singular: 'res.vehicle.singular', plural: 'res.vehicle.plural' },
      icon: 'car',
      group: 'catalog',
      order: 10,
      titleField: 'name',
      subtitleField: 'trimLevel',
      tenantScoped: true,
      capabilities: [
        { name: 'list',   kind: 'list',   method: 'GET',    path: '/vehicles',     roles: ['admin'] },
        { name: 'read',   kind: 'read',   method: 'GET',    path: '/vehicles/:id', roles: ['admin'] },
        { name: 'create', kind: 'create', method: 'POST',   path: '/vehicles',     roles: ['admin'] },
        { name: 'update', kind: 'update', method: 'PUT',    path: '/vehicles/:id', roles: ['admin'] },
        { name: 'delete', kind: 'delete', method: 'DELETE', path: '/vehicles/:id', roles: ['admin'], target: ['row', 'bulk'] },
        {
          name: 'publish',
          kind: 'action',
          method: 'PATCH',
          path: '/vehicles/:id/status',
          roles: ['admin'],
          label: 'action.vehicle.publish',
          icon: 'check',
          target: ['row', 'bulk'],
          payload: { status: 'published' },
          visibleWhen: { status: { neq: 'published' } },
          refresh: true
        },
        {
          name: 'archive',
          kind: 'action',
          method: 'PATCH',
          path: '/vehicles/:id/status',
          roles: ['admin'],
          label: 'action.vehicle.archive',
          icon: 'archive',
          target: ['row', 'bulk'],
          payload: { status: 'archived' },
          refresh: true
        }
      ],
      defaultSort: [{ field: 'importance', order: 'desc' }],
      search: { fields: ['name', 'trimLevel', 'description', 'tag'], operator: 'containsi' },
      fields: [
        { name: 'status', type: 'enum', enumRef: 'vehicleStatus' },
        { name: 'visible', type: 'boolean' },
        { name: 'featured', type: 'boolean' },
        { name: 'importance', type: 'integer' },
        {
          name: 'brand',
          type: 'relation',
          relation: { resource: 'brand', kind: 'many-to-one', titleField: 'name', foreignKey: 'brandId' }
        },
        { name: 'name', type: 'string', required: true },
        { name: 'trimLevel', type: 'string' },
        { name: 'tag', type: 'string' },
        { name: 'description', type: 'richtext' },
        { name: 'engine', type: 'enum', enumRef: 'engineType' },
        { name: 'category', type: 'enum', enumRef: 'vehicleCategory' },
        { name: 'gearbox', type: 'enum', enumRef: 'gearboxType' },
        { name: 'doors', type: 'integer' },
        { name: 'seats', type: 'integer' },
        { name: 'optional', type: 'text' },
        { name: 'svcKasko', type: 'boolean' },
        { name: 'svcMaintenance', type: 'boolean' },
        { name: 'svcRca', type: 'boolean' },
        { name: 'svcRoadside', type: 'boolean' },
        { name: 'monthlyVatExcl', type: 'number', validation: { min: 0, step: 0.01 } },
        { name: 'months', type: 'integer' },
        { name: 'km', type: 'integer' },
        { name: 'readyDelivery', type: 'boolean' },
        {
          name: 'images',
          type: 'image',
          image: {
            multiple: true,
            ordered: true,
            cover: 'first',
            altField: 'altView',
            accept: ['image/png', 'image/jpeg', 'image/webp'],
            maxSize: 5242880,
            storage: 'folder',
            endpoints: {
              upload: { method: 'POST', path: '/vehicles/:id/images' },
              reorder: { method: 'PUT', path: '/vehicles/:id/images/reorder' },
              update: { method: 'PUT', path: '/vehicles/:id/images/:imageId' },
              remove: { method: 'DELETE', path: '/vehicles/:id/images/:imageId' }
            }
          }
        }
      ],
      views: { list: 'auto', create: 'auto', edit: 'auto', show: 'auto' }
    },
    {
      name: 'newsletter',
      path: 'newsletter',
      label: { singular: 'res.newsletter.singular', plural: 'res.newsletter.plural' },
      icon: 'mail',
      group: 'crm',
      order: 10,
      titleField: 'email',
      tenantScoped: true,
      capabilities: [
        { name: 'list',   kind: 'list',   method: 'GET',    path: '/newsletter',     roles: ['admin'] },
        { name: 'read',   kind: 'read',   method: 'GET',    path: '/newsletter/:id', roles: ['admin'] },
        { name: 'create', kind: 'create', method: 'POST',   path: '/newsletter',     roles: ['admin'] },
        { name: 'delete', kind: 'delete', method: 'DELETE', path: '/newsletter/:id', roles: ['admin'], target: ['row', 'bulk'] },
        {
          name: 'export',
          kind: 'action',
          method: 'GET',
          path: '/newsletter/export',
          roles: ['admin'],
          label: 'action.newsletter.export',
          icon: 'download',
          target: ['collection'],
          download: 'text/csv'
        }
      ],
      defaultSort: [{ field: 'subscribedAt', order: 'desc' }],
      search: { fields: ['email'], operator: 'containsi' },
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'subscribedAt', type: 'datetime', readOnly: true },
        { name: 'privacyAccepted', type: 'boolean', default: true }
      ],
      views: { list: 'auto', create: 'auto', show: 'auto' }
    },
    {
      name: 'user',
      path: 'users',
      label: { singular: 'res.user.singular', plural: 'res.user.plural' },
      icon: 'users',
      group: 'settings',
      order: 5,
      titleField: ['firstName', 'lastName'],
      subtitleField: 'email',
      tenantScoped: false,
      capabilities: [
        { name: 'list',   kind: 'list',   method: 'GET',    path: '/users',     roles: ['admin'] },
        { name: 'read',   kind: 'read',   method: 'GET',    path: '/users/:id', roles: ['admin'] },
        { name: 'create', kind: 'create', method: 'POST',   path: '/users',     roles: ['admin'] },
        { name: 'update', kind: 'update', method: 'PUT',    path: '/users/:id', roles: ['admin'] },
        { name: 'delete', kind: 'delete', method: 'DELETE', path: '/users/:id', roles: ['admin'] }
      ],
      defaultSort: [{ field: 'createdAt', order: 'desc' }],
      search: { fields: ['email', 'firstName', 'lastName', 'username'], operator: 'containsi' },
      fields: [
        { name: 'firstName', type: 'string' },
        { name: 'lastName', type: 'string' },
        { name: 'email', type: 'email', required: true },
        { name: 'username', type: 'string' },
        { name: 'role', type: 'enum', enumRef: 'userRole' },
        { name: 'blocked', type: 'boolean', default: false },
        { name: 'password', type: 'string', writeOnly: true },
        { name: 'createdAt', type: 'datetime', readOnly: true }
      ],
      views: { list: 'auto', create: 'auto', edit: 'auto', show: 'auto' }
    },
    {
      name: 'company',
      path: 'company',
      label: { singular: 'res.company.singular', plural: 'res.company.plural' },
      icon: 'building',
      group: 'settings',
      order: 10,
      singleton: true,
      tenantScoped: false,
      capabilities: [
        { name: 'read',   kind: 'read',   method: 'GET', path: '/company', roles: ['admin'] },
        { name: 'update', kind: 'update', method: 'PUT', path: '/company', roles: ['admin'] }
      ],
      fields: [
        { name: 'legalName', type: 'string', required: true },
        { name: 'vatNumber', type: 'string' },
        { name: 'taxCode', type: 'string' },
        { name: 'address', type: 'string' },
        { name: 'city', type: 'string' },
        { name: 'province', type: 'string' },
        { name: 'zip', type: 'string' },
        { name: 'phone', type: 'string' },
        { name: 'email', type: 'email' },
        { name: 'website', type: 'url' },
        { name: 'facebook', type: 'url' },
        { name: 'instagram', type: 'url' },
        { name: 'linkedin', type: 'url' }
      ],
      views: { edit: 'auto' }
    }
  ]
}
