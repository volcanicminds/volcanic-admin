/**
 * Mock manifest modelled on the Dionisi Rent & Service backoffice
 * (BACKOFFICE_BLUEPRINT.md). Exercises the full spec v2: groups, shared enums,
 * a relation (vehicle→brand), a singleton (company), capabilities, search,
 * defaultSort, per-field list/form behavior, and a multi-tenant header.
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
      listLayouts: ['table', 'card'],
      defaultListLayout: 'card',
      fields: [
        { name: 'name', type: 'string', required: true, list: { visible: true, sortable: true } },
        {
          name: 'logoUrl',
          type: 'image',
          form: { group: 'default', widget: 'image-single' },
          image: { multiple: false, accept: ['image/png', 'image/jpeg', 'image/webp'], maxSize: 5242880, storage: 'folder' }
        },
        { name: 'createdAt', type: 'datetime', readOnly: true, list: { visible: true, sortable: true } }
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
      listLayouts: ['table', 'card'],
      defaultListLayout: 'card',
      fields: [
        {
          name: 'status',
          type: 'enum',
          enumRef: 'vehicleStatus',
          list: { visible: true, filterable: true, operators: ['eq', 'in'] },
          form: { group: 'header', widget: 'select' }
        },
        { name: 'visible', type: 'boolean', list: { visible: true, filterable: true }, form: { group: 'header' } },
        { name: 'featured', type: 'boolean', list: { visible: true }, form: { group: 'header' } },
        {
          name: 'importance',
          type: 'integer',
          list: { visible: true, sortable: true, filterable: true, operators: ['ge', 'le'] },
          form: { group: 'header' }
        },
        {
          name: 'brand',
          type: 'relation',
          relation: { resource: 'brand', kind: 'many-to-one', titleField: 'name', foreignKey: 'brandId' },
          list: { visible: true, filterable: true, operators: ['eq', 'in'] },
          form: { visible: true, widget: 'reference-select', group: 'header' }
        },
        { name: 'name', type: 'string', required: true, list: { visible: true, sortable: true }, form: { group: 'header', colSpan: 2 } },
        { name: 'trimLevel', type: 'string', list: { visible: true }, form: { group: 'header' } },
        { name: 'tag', type: 'string', form: { group: 'header' } },
        { name: 'description', type: 'richtext', list: { visible: false }, form: { widget: 'rich-text', group: 'header', colSpan: 2 } },
        { name: 'engine', type: 'enum', enumRef: 'engineType', form: { group: 'features' } },
        { name: 'category', type: 'enum', enumRef: 'vehicleCategory', form: { group: 'features' } },
        { name: 'gearbox', type: 'enum', enumRef: 'gearboxType', form: { group: 'features' } },
        { name: 'doors', type: 'integer', form: { group: 'features' } },
        { name: 'seats', type: 'integer', form: { group: 'features' } },
        { name: 'optional', type: 'text', form: { group: 'features', colSpan: 2 } },
        { name: 'svcKasko', type: 'boolean', form: { group: 'services' } },
        { name: 'svcMaintenance', type: 'boolean', form: { group: 'services' } },
        { name: 'svcRca', type: 'boolean', form: { group: 'services' } },
        { name: 'svcRoadside', type: 'boolean', form: { group: 'services' } },
        {
          name: 'monthlyVatExcl',
          type: 'number',
          validation: { min: 0, step: 0.01 },
          list: { visible: true, sortable: true, align: 'right', operators: ['ge', 'le', 'between'] },
          form: { group: 'contract' }
        },
        { name: 'months', type: 'integer', form: { group: 'contract' } },
        { name: 'km', type: 'integer', form: { group: 'contract' } },
        { name: 'readyDelivery', type: 'boolean', form: { group: 'contract' } },
        {
          name: 'images',
          type: 'image',
          list: { visible: true },
          form: { widget: 'gallery-reorder', group: 'images', colSpan: 2 },
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
      listLayouts: ['table', 'card'],
      defaultListLayout: 'table',
      cardFields: ['subscribedAt', 'privacyAccepted'],
      fields: [
        { name: 'email', type: 'email', required: true, list: { visible: true, sortable: true } },
        {
          name: 'subscribedAt',
          type: 'datetime',
          readOnly: true,
          list: { visible: true, sortable: true, operators: ['ge', 'le', 'between'] }
        },
        { name: 'privacyAccepted', type: 'boolean', default: true, list: { visible: true } }
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
      listLayouts: ['table', 'card'],
      defaultListLayout: 'table',
      search: { fields: ['email', 'firstName', 'lastName', 'username'], operator: 'containsi' },
      fields: [
        { name: 'firstName', type: 'string', list: { visible: true, sortable: true }, form: { group: 'profile' } },
        { name: 'lastName', type: 'string', list: { visible: true, sortable: true }, form: { group: 'profile' } },
        {
          name: 'email',
          type: 'email',
          required: true,
          list: { visible: true, sortable: true },
          form: { group: 'profile' }
        },
        { name: 'username', type: 'string', list: { visible: true }, form: { group: 'profile' } },
        {
          name: 'role',
          type: 'enum',
          enumRef: 'userRole',
          list: { visible: true, filterable: true, operators: ['eq', 'in'] },
          form: { group: 'access', widget: 'select' }
        },
        { name: 'blocked', type: 'boolean', default: false, list: { visible: true }, form: { group: 'access' } },
        {
          name: 'password',
          type: 'string',
          list: { visible: false },
          form: { group: 'access', widget: 'password', placeholder: 'field.user.password.ph' }
        },
        { name: 'createdAt', type: 'datetime', readOnly: true, list: { visible: true, sortable: true } }
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
        { name: 'legalName', type: 'string', required: true, form: { group: 'company' } },
        { name: 'vatNumber', type: 'string', form: { group: 'company' } },
        { name: 'taxCode', type: 'string', form: { group: 'company' } },
        { name: 'address', type: 'string', form: { group: 'site', colSpan: 2 } },
        { name: 'city', type: 'string', form: { group: 'site' } },
        { name: 'province', type: 'string', form: { group: 'site' } },
        { name: 'zip', type: 'string', form: { group: 'site' } },
        { name: 'phone', type: 'string', form: { group: 'site' } },
        { name: 'email', type: 'email', form: { group: 'site' } },
        { name: 'website', type: 'url', form: { group: 'social' } },
        { name: 'facebook', type: 'url', form: { group: 'social' } },
        { name: 'instagram', type: 'url', form: { group: 'social' } },
        { name: 'linkedin', type: 'url', form: { group: 'social' } }
      ],
      views: { edit: 'auto' }
    }
  ]
}
