/**
 * Mock manifest modelled on the Dionisi Rent & Service backoffice
 * (BACKOFFICE_BLUEPRINT.md). Exercises the full spec v1: groups, shared enums,
 * a relation (vehicle→brand), a singleton (company), capabilities, search,
 * defaultSort, per-field list/form behavior, and a multi-tenant header.
 */
import type { Manifest } from "@/engine";

export const mockManifest: Manifest = {
  version: 1,
  generatedAt: "2026-06-26T10:00:00Z",
  i18n: { defaultLocale: "it", locales: ["it", "en"] },
  auth: {
    mode: "bearer",
    endpoints: {
      login: "/auth/login",
      refresh: "/auth/refresh-token",
      logout: "/auth/logout",
    },
  },
  tenancy: {
    mode: "multi",
    switchable: true,
    header: "x-tenant-id",
    listEndpoint: "/tenants",
  },
  defaults: {
    list: {
      pageSizes: [10, 25, 50, 100], // elenco page size disponibili nel menu a tendina
      pageSize: 25, //size page di default selezionato
    },
    delete: {
      bulk: 10, // elementi alla volta
    }
  },
  groups: [
    { name: "catalog", label: "group.catalog", icon: undefined, order: 10 },
    { name: "crm", label: "group.crm", icon: undefined, order: 20 },
    { name: "settings", label: "group.settings", icon: undefined, order: 30 },
  ],
  enums: {
    vehicleStatus: [
      { value: "draft", label: "enum.vehicleStatus.draft", color: undefined },
      {
        value: "published",
        label: "enum.vehicleStatus.published",
        color: undefined,
      },
      {
        value: "archived",
        label: "enum.vehicleStatus.archived",
        color: undefined,
      },
    ],
    engineType: [
      { value: "petrol", label: "enum.engineType.petrol", color: undefined },
      { value: "diesel", label: "enum.engineType.diesel", color: undefined },
      { value: "hybrid", label: "enum.engineType.hybrid", color: undefined },
      {
        value: "electric",
        label: "enum.engineType.electric",
        color: undefined,
      },
    ],
    vehicleCategory: [
      {
        value: "city_car",
        label: "enum.vehicleCategory.city_car",
        color: undefined,
      },
      { value: "sedan", label: "enum.vehicleCategory.sedan", color: undefined },
      {
        value: "station_wagon",
        label: "enum.vehicleCategory.station_wagon",
        color: undefined,
      },
      {
        value: "suv_crossover",
        label: "enum.vehicleCategory.suv_crossover",
        color: undefined,
      },
      {
        value: "commercial",
        label: "enum.vehicleCategory.commercial",
        color: undefined,
      },
    ],
    gearboxType: [
      { value: "manual", label: "enum.gearboxType.manual", color: undefined },
      {
        value: "automatic",
        label: "enum.gearboxType.automatic",
        color: undefined,
      },
    ],
    userRole: [
      { value: "admin", label: "enum.userRole.admin", color: undefined },
      { value: "editor", label: "enum.userRole.editor", color: undefined },
      { value: "viewer", label: "enum.userRole.viewer", color: undefined },
    ],
  },
  resources: [
    {
      name: "brand",
      path: "brands",
      label: { singular: "res.brand.singular", plural: "res.brand.plural" },
      icon: undefined,
      group: "catalog",
      order: 10,
      titleField: "name", // <- titleField: ['name', 'altrofield'], -> es name: pippo altrofield: x -> renderizza "Pippo X" o altro modo comodo
      subtitleField: ["fieldA", "fieldB"], // <-- o semplicemente "fieldC" ossia come titleField stessa def
      tenantScoped: false,
      permissions: {
        list: ["admin"],
        read: ["admin"],
        create: ["admin"],
        update: ["admin"],
        delete: ["admin"],
      },
      capabilities: { 
        create: {
          label: "action.brands.create",
          icon: undefined,
          // kind: ["row", "bulk"], // non applicabile
          method: "POST",
          path: "/vehicles",
          payload: { .. },
          visibleWhen: { ... },
          roles: ["admin"],
          refresh: true,
        }, 
        update: false,  //es ma in realtà è definito come gli altri
        delete: {
          label: "action.brands.create",
          icon: undefined,
          kind: ["row", "bulk"], // <- nel caso bulk esegue promise di tot alla volta records
          method: "DELETE",
          path: "/vehicles/:id",
          payload: { .. },
          visibleWhen: { ... },
          roles: ["admin"],
          refresh: true,
        },
        search: {
          label: "action.brands.search",
          icon: undefined,
          // kind: ["row", "bulk"], // non applicabile
          method: "GET",
          path: "/vehicles",
          payload: { .. },
          visibleWhen: { ... },
          roles: ["admin"],
          refresh: true,
        },
        detail: {
          label: "action.brands.detail",
          icon: undefined,
          // kind: ["row", "bulk"], // non applicabile
          method: "GET",
          path: "/vehicles/:id",
          payload: { .. },
          visibleWhen: { ... },
          roles: ["admin"],
          refresh: true,
        }
      },
      list: {
        defaultSort: [{ field: "name", order: "asc" }],
        search: { fields: ["name"], operator: "containsi" }, // omni search, piuttosto rinominiamolo in altro es searchField o gloabalSearch o simili chiari
        layouts: ["table", "card"],
        defaultLayout: "card",
      },
      fields: [
        // esempi pratici finali post manipolazione utente lato bo / admin panel
        {
          name: "name",
          type: "string",
          required: true,
          list: { visible: true, sortable: true },
        },
        {
          name: "logoUrl",
          type: "image",
          form: { group: "default", widget: "image-single" },
          image: {
            multiple: false,
            accept: ["image/png", "image/jpeg", "image/webp"],
            maxSize: 5242880,
            storage: "folder",
          },
        },
        {
          name: "createdAt",
          type: "datetime",
          readOnly: true,
          list: { visible: true, sortable: true },
        },
      ],
      actions: [
        {
          name: "publish",
          label: "action.vehicle.publish",
          icon: "check",
          kind: ["row", "bulk"],
          method: "PATCH",
          path: "/vehicles/:id/status",
          payload: { status: "published" },
          visibleWhen: { status: { neq: "published" } },
          visibleWhere: ['list', 'detail'],
          roles: ["admin"],
          refresh: true,
        },
        {
          name: "archive",
          label: "action.vehicle.archive",
          icon: "archive",
          kind: ["row", "bulk"],
          method: "PATCH",
          path: "/vehicles/:id/status",
          payload: { status: "archived" },
          visibleWhere: ['detail'],
          roles: ["admin"],
          refresh: true,
        },
      ],
      views: { list: "auto", create: "auto", edit: "auto", show: "auto" },
    },    // ecc ecc le altre
  ],
};
