# Architecture — Manifest & Engine (v2)

> **Single** architecture document for the manifest-driven backoffice of the Volcanic Minds ecosystem. It defines the
> **contract** (Manifest v2), the **lifecycle** (how it is born, where it lives, how it is consumed), the
> **engine/ui architecture** (Refine + shadcn), the **override model** and **multi-tenancy**.
> In case of conflict with the code, **the code wins**.
>
> **Status**: implemented. The admin engine ships **Manifest v2** (`src/engine/types/manifest.ts`, `version: 2`); this
> document describes the contract as built. It is the reference for `manifest.v2.schema.json` (the BE↔admin boundary
> schema) and the companion of [`CONFIGURATION.md`](./CONFIGURATION.md) (the exhaustive knob-by-knob reference).

---

## 0. Foundational decisions (v2)

- **Frontend base**: **Refine** (MIT, headless) + **shadcn/ui**. Our own identity, ownable.
- **Schema source**: **Volcanic Manifest** emitted by the backend, derived **only from route + JSON Schema** (see §3).
- **Contract = Manifest v2**: unified array **`capabilities`** (`CapabilitySpec[]`) that collapses the v1
  `permissions` + `capabilities`(boolean) + `actions`; `roles` in a single place.
- **Scope**: `resources[]` (CRUD) **+** top-level `capabilities[]` (standalone *operation* sections).
- **Schema-only generation**: the generator does **not** read the data layer (no entity-metadata). Consequence:
  lean `relation` (no `kind`/`foreignKey`), enums only if in the schema; anything beyond goes into the overrides.
- **Graduated sensitivity**: `password` write-only; `token`/`mfaSecret`/`externalId` always excluded.
- **Override**: structural hints on the BE side in `config` of `routes.ts` + **generated/overrides** split on the admin side
  (no `defineAdminResource`).
- **No autoCrud**: the manifest describes **real hand-written endpoints** (`/vehicles`, …), not `/admin/<resource>`
  auto-mounted ones. AutoCrud remains a separate future capability.
- **Build-time consumption + snapshot**, **full** manifest with declared `roles[]` (not runtime per-role).
- **Packaging**: a single frontend package `@volcanicminds/admin` (internal headless `engine` + shadcn `ui`); manifest
  generation is an **optional capability of `@volcanicminds/backend`**, not a second package.
- **Code language**: everything in English (entities, fields, enums, paths, manifest keys). UI labels via i18n.

---

## 1. What the manifest is

A **JSON descriptor** of the administrable API, produced by the backend and consumed by the admin to **generate the
panel with no code**. It is the other projection of the same source that feeds Swagger: `route + schema`. A single
maintenance, two outputs (OAS for developers, manifest for the admin).

Invariant principles:

- **Canonical field identity = `(resource, field)`**, not `(schema, property)`. The N schema projections
  (body/response/public) collapse onto the canonical identity.
- **Every label is an i18n key**, never literal text. Translation is a project/admin datum.
- **Responsibility boundary**: the BE describes *structure, domain, security*; the admin decides *presentation*.

Difference vs AdminJS (DB-coupled): there the ORM models were read, bypassing the logic. Here the richness is derived
from metadata but **delivered via API/manifest**: the engine does not touch the DB, it respects the service layer, Magic Query,
multi-tenancy, sensitive fields, permissions.

---

## 2. v2 contract (types)

> **The emitted manifest is DATA + STRUCTURE only.** The BE emits the `fields`
> (`name`/`type`/`enum`/`relation`/`image`/`validation` + the *semantic capabilities*
> `filterable`/`sortable`/`operators`/`writeOnly`), the `capabilities`, `search` and
> `defaultSort`. It **never** emits presentation or ordering: columns, cards,
> layout and form groups live in the resource's ordered `list`/`form` **view blocks**,
> populated **only from overrides** (§2.5). This is why the `generated` file is always
> rewritable without losing the UI.

### 2.1 Top level

```ts
interface Manifest {
  version: 2
  generatedAt: string
  i18n: { defaultLocale: string; locales: string[] }
  auth: { mode: 'cookie' | 'bearer'; endpoints: { login: string; refresh: string; logout: string; [k: string]: string } }
  tenancy: { mode: 'single' | 'multi'; switchable?: boolean; header?: string; listEndpoint?: string }
  groups: GroupSpec[]
  enums: Record<string, EnumOption[]>
  resources: ResourceSpec[]
  capabilities?: CapabilitySpec[]   // standalone "operation" sections (not tied to a resource)
}
```

### 2.2 `CapabilitySpec` — the heart of v2

A single type that **unifies** what in v1 were three separate fields (`permissions` + boolean `capabilities` +
`actions`). Used in **two positions**: inside the resource (`ResourceSpec.capabilities`) and top-level
(`Manifest.capabilities`, the operation sections). The `roles` stay **in a single place**.

```ts
type CapabilityKind = 'list' | 'read' | 'create' | 'update' | 'delete' | 'action'

interface CapabilitySpec {
  name: string                 // unique within the scope: 'list' | 'create' | ... | 'publish' | 'export'
  kind: CapabilityKind         // standard CRUD, or 'action' for custom ones
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string                 // binding to the REAL endpoint — single source
  roles: string[]              // declared authorization (effective gating: admin runtime + BE enforcement)
  enabled?: boolean            // default true

  // --- only for kind:'action' (presentation/behavior) ---
  label?: I18nKey
  icon?: string
  target?: ('row' | 'bulk' | 'collection')[]
  payload?: Record<string, unknown>          // static body merged into the request
  confirm?: boolean
  confirmText?: I18nKey
  visibleWhen?: Record<string, Record<string, unknown>>   // row condition (field→operator→value)
  refresh?: boolean
  download?: string                          // mime-type when the action returns a file
  component?: string | null                  // override registry id; null → generic handler
}
```

**Derivation rules (engine):**

```ts
const can = (caps, kind) => caps.some(c => c.kind === kind && c.enabled !== false)
canCreate = can(resource.capabilities, 'create')
canUpdate = can(resource.capabilities, 'update')
canDelete = can(resource.capabilities, 'delete')
canBulkDelete = resource.capabilities.some(c => c.kind === 'delete' && c.target?.includes('bulk'))
// 'list'/'read' implicit given the presence of the resource; search is resource.search (see 2.4), not a capability.
```

### 2.3 `ResourceSpec`

```ts
interface ResourceSpec {
  name: string                 // canonical singular (e.g. 'vehicle') — key of the schema→resource mapping
  path: string                 // plural URL segment (e.g. 'vehicles')
  label: { singular: I18nKey; plural: I18nKey }
  icon?: string; group?: string; order?: number
  idField?: string
  titleField?: string | string[]      // BE indicates the fields; i18n template = admin override
  subtitleField?: string | string[]
  tenantScoped?: boolean; softDelete?: boolean; singleton?: boolean
  capabilities: CapabilitySpec[]       // CRUD + custom actions (replaces v1 permissions+capabilities+actions)
  defaultSort?: SortSpec[]
  search?: SearchSpec                  // search config (globalSearch), NOT a capability
  list?: ListViewSpec          // ordered collection view (table + card) — ONLY from override, never from the BE
  form?: FormViewSpec          // ordered form/show view — ONLY from override, never from the BE
  fields: FieldSpec[]
  views?: { list?: ViewMode; create?: ViewMode; edit?: ViewMode; show?: ViewMode }
}
```

> The presentation flat props of the initial v1 (`listLayouts`/`defaultListLayout`/
> `cardFields` and the like) **no longer exist**: layouts, columns and cards are now
> described by the ordered `list`/`form` view blocks (§2.5), authored **only** in the
> overrides — the BE never emits them.

### 2.4 `FieldSpec`, enums, search, relation

```ts
type FieldType =
  | 'string' | 'text' | 'textarea' | 'richtext' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'
  | 'enum' | 'relation' | 'email' | 'url' | 'uuid' | 'json' | 'image' | 'file'

// FieldSpec = DATA + STRUCTURE only: the BE emits exactly this. No
// presentation or ordering here — they live in the resource's view blocks (§2.5).
interface FieldSpec {
  name: string
  type: FieldType
  label?: I18nKey
  required?: boolean; readOnly?: boolean; nullable?: boolean; default?: unknown; help?: I18nKey
  writeOnly?: boolean          // in the write body, never read/listed (e.g. password)
  enum?: EnumOption[]; enumRef?: string
  relation?: { resource: string; titleField?: string; kind?: RelationKind; foreignKey?: string }  // kind/fk: only via override (schema-only)
  image?: ImageSpec            // populated only via admin override (the BE does not generate it)
  validation?: ValidationSpec  // required/min/max/minLength/maxLength/pattern/step — from the schema
  // semantic capabilities (shared by table + card + filters): describe what the
  // field CAN do, not how it appears
  filterable?: boolean
  sortable?: boolean           // default true for non-relation/json; the BE can force false
  operators?: FilterOperator[]
}

interface SearchSpec { fields: string[]; operator?: FilterOperator }   // globalSearch: OR over multiple fields
interface EnumOption { value: string; label: I18nKey; color?: string }
```

> The previous `FieldListSpec` has been **removed**; `FieldFormSpec` survives only
> as a type **internal to the interpreter** (per-field form presentation *resolved* from the
> `form` view block, read by the widgets) — it is **no longer** an authorable sub-object of the
> field. List/form presentation is authored in the ordered view blocks (§2.5), not on the
> field.

### 2.5 Ordered view blocks (`list` / `form`) — override only

Presentation and ordering live in **ordered view blocks**, authored in the project
overrides: the BE never emits them. **The order of the array IS the render order**
and, when present, the array is the **authoritative allowlist** (a field not
listed does not appear in that view); an **absent** block → the engine derives a
sensible default from the `fields` (declaration order). This replaces the old
behavior where reordering had no effect (merge by-name that preserved the
generated order).

The types are **generic over the field-name union `F`** (default `string`, so that the
runtime `ResourceSpec` and untyped overrides keep working); project overrides
opt into compile-time type-checking of field names by passing a generated
field-map to `ManifestOverrides<FM>` (`volcanic-admin-pull` emits
`GeneratedFieldMap`).

```ts
interface ListViewSpec {
  layouts?: ('table' | 'card')[]     // >1 → the layout toggle appears
  defaultLayout?: 'table' | 'card'   // fallback: layouts[0], else 'table'
  sort?: string[]                    // "sort by" options, in order (absent → the sortable fields)
  table?: { columns?: ColumnSpec[] } // ordered allowlist of columns
  card?: CardViewSpec
}

interface ColumnSpec { field: string; label?: I18nKey; align?: 'left'|'center'|'right'; width?: number }

interface CardViewSpec {
  minWidth?: number; maxWidth?: number   // maxWidth enables the fluid grid (wins over columns)
  columns?: number                       // fixed-column grid (used if maxWidth is not set)
  align?: 'left' | 'center'
  highlight?: string                     // boolean field → "featured" card (accent ring + star)
  image?: string                         // image field for the cover carousel
  title?: string | string[]              // default: titleField (array → space-joined)
  subtitle?: string | string[]           // default: subtitleField
  badges?: string[]                      // enum fields rendered as chips, in order
  body?: { field: string; label?: I18nKey }[]   // extra labeled key/value rows, in order
}

interface FormViewSpec {
  columns?: number                       // default grid columns (1–4, default 2)
  groups?: {
    name: string                         // 'default' → rendered without header
    label?: I18nKey                      // fallback group.<name>
    columns?: number                     // column override for this group
    fields: FormFieldSpec[]              // ordered allowlist of the group's fields
  }[]
}

interface FormFieldSpec {
  field: string
  label?: I18nKey
  widget?: string                        // 'auto' or a registered/built-in widget id
  colSpan?: number                       // columns occupied in the grid (capped at the width)
  colStart?: number                      // 1-based starting column (md+): leaves the preceding
                                         //   cells empty and breaks the row if already occupied
  rowSpan?: number                       // rows occupied (md+): e.g. a tall textarea next to
                                         //   several fields stacked in another column
  visibleOn?: 'create' | 'edit'          // limits to one mode (omitted = both)
  placeholder?: I18nKey
  suggestions?: (string | number)[]      // non-binding suggestions for the 'combobox' widget
  rows?: number                          // visible text rows for 'textarea'/'richtext' (editing
                                         //   height; unrelated to rowSpan, which is grid cells)
  toolbar?: RichTextAction[]             // 'richtext' toolbar actions (unset = all); every action
                                         //   must survive the server-side HTML sanitizer
}
```

**Field types (default render):** `string`→input · `text`→textarea · `richtext`→WYSIWYG (HTML sanitized on the server
side) · `integer`/`number`→numeric · `boolean`→switch · `date`/`datetime`→picker · `enum`→select (inline or
`enumRef`) · `relation`→reference-select · `email`/`url`→validated input · `uuid`→readOnly · `json`→editor ·
`image`/`file`→uploader.

**Filter operators (`FilterOperator`)** = subset of Magic Query exposed to the UI: `eq, neq, contains[i],
ncontains[i], starts[i], ends[i], gt, ge, lt, le, between, in, nin, null, notNull`. `:raw` is **never** exposed. The
type→recommended-operators map is a presentation choice (admin); the BE can only restrict.

---

## 3. Backend-side generation (optional capability, schema-only)

Enabled via `config.options.manifest.enabled` on the backend. **One** responsibility: generate the manifest over the
**existing hand-written endpoints**. **No** generic-CRUD auto-mount: the manifest links the real endpoints;
the custom routes (images, status, export) stay in their modules.

### 3.1 The sources (only route + schema)

The generator **derives**, it does not invent, combining in increasing order of authority:

1. **`global.routes`** (exposed by the core): method, **real** path, `roles`, and the file-level +
   per-route `config` with the **structural hints** (§3.4).
2. **Registered JSON Schemas** (`server.getSchemas()`): for each route, it resolves the `$ref`s of `doc.body`/`doc.response`
   → fields, types, `required`, `validation` (`min/max/minLength/maxLength/pattern/format`), inline `enum`.
3. **`config` hints** of `routes.ts` (§3.4): `resource.name` (schema→resource mapping, no fragile heuristics),
   `group`, `titleField`, `subtitleField`, `globalSearch`.

> **No entity-metadata**. So `relation.kind`, `foreignKey`, `image`, and enums not declared in the
> schema are **not** generated: they are filled in the admin `overrides`. It is a deliberate downgrade of fidelity in exchange for
> total decoupling from the data layer (the core neither imports nor queries `/typeorm`).

### 3.2 Pipeline

```
global.routes (+ config hints)  ─┐
server.getSchemas() ($ref deref) ─┼─▶ per resource:
hint config (group/title/search) ─┘   1. group the routes by resource (hint resource.name + path)
                                       2. fields ← collapse of schema projections onto (resource, field)
                                       3. capabilities ← CRUD verbs + custom routes (kind:'action')
                                       4. roles ← route.roles (a single place)
                                       5. drop sensitive (graduated §5/§9)
                                       ▶ ResourceSpec
non-resource endpoints ───────────────▶ Manifest.capabilities[] (operation sections)
manifest = { meta, i18n, auth, tenancy, groups, enums, resources[], capabilities[] }
```

Per-property precedence: **hint config > JSON Schema > default per type**.

### 3.3 i18n by convention

The generator emits **keys**, never text: `res.<name>.{singular,plural}`, `field.<resource>.<field>`,
`enum.<EnumName>.<value>`, `action.<resource>.<action>`, `group.<name>`, `op.<name>` (operation sections). The
project provides the translations; missing keys → fallback to the key or to a humanized label.

### 3.4 Structural hints in `routes.ts` (L1, BE side)

Additive, optional, domain (no UI). Grouped under **`config.manifest`** (file-level and/or per-route), to
keep them separate from the route's operational config (Fastify schema, controller, …):

```ts
export const config = {
  // …operational config (title, controller, tags, …)…
  manifest: {
    group: 'catalog',
    resource: {
      name: 'vehicle',               // schema→resource mapping (authoritative); path 'vehicles' → name 'vehicle'
      titleField: 'name',
      subtitleField: 'trimLevel',
      globalSearch: ['name', 'trimLevel', 'description', 'tag', 'brand.name']
    }
  }
}
```

> **Convention (≥ 3.3.0)**: the hints live under `config.manifest`; the flat form `config.{group,resource}` is **no
> longer supported** (no backward compatibility). The framework's native APIs (`users`/`tenants`) already declare the
> hints → resources `user`/`tenant` (singular name, `path` plural unchanged), group `system`.

If `group` is missing → fallback to the API folder name. If `titleField` is missing → heuristic (`name`→`title`→`label`→
first `string`). `globalSearch` is the **single source** of the omni-search fields (on the controller side it is read from here,
eliminating duplications such as `omniSearch.ts`).

### 3.5 Delivery: full manifest + build-time

- **Full manifest** (not per-user): lists all resources/capabilities with the **declared** `roles`.
- **`GET /admin/manifest`** (DEV): the admin fetches it at startup.
- **Dump/snapshot** (BUILD): a command that emits `manifest.json` to a file → the admin CI builds without the live BE.
- **Per-role gating** is admin at runtime (hides what the role cannot use) **+ authoritative enforcement
  on the BE endpoints** (defense in depth). No per-role cache on the BE side (it was a need of the v1 runtime model,
  superseded by build-time consumption).

---

## 4. Lifecycle (build-time, generated/overrides split)

```
┌─ BE (volcanic-backend) ───────────────────────────────────────────────┐
│ config.options.manifest.enabled = true                                 │
│   global.routes  +  server.getSchemas()   ── generator (schema-only) ──▶ Manifest JSON (full, declared roles)
│   GET /admin/manifest        and/or       dump → manifest.json (CI snapshot)                                   │
└────────────────────────────────────────────────────────────────────────┘
                                   │ fetch (DEV at startup) / snapshot (BUILD)
                                   ▼
┌─ Admin (volcanic-admin) ──────────────────────────────────────────────┐
│ manifest.generated.ts   ← always regenerated, NEVER edited by hand     │
│ manifest.overrides.ts   ← project only, empty scaffold, NEVER regenerated│
│                         merge( generated, overrides )  by (resource,field)
│                                   ▼                                     │
│                 engine + ui  → panel (zero-config + override)          │
└────────────────────────────────────────────────────────────────────────┘
```

- **DEV**: fetch to `GET /admin/manifest` at startup. **BUILD**: reads the committed snapshot (decoupled admin CI).
- **Split**: the regenerator overwrites only `generated`; the `overrides` survive → no destructive drift.
- **Merge by identity `(resource, field)`**: the *intrinsic* field and capability overrides hook by canonical key, not by position/schema. The **render order**, instead, is given by the arrays of the `list`/`form` view blocks (the order of the array IS the render order — §2.5).

---

## 5. Engine + UI (Refine, internal split)

One package, two halves. The **`engine`** is headless and does **not import shadcn**; the **`ui`** consumes the engine and renders with
shadcn → the UI is replaceable.

```
@volcanicminds/admin
  ├─ engine/   (headless)
  │   ├─ manifest interpreter   → manifest → resource model → <Resource> Refine
  │   ├─ dataProvider           → Refine operations → REST + Magic Query (field:op=value, sort, page/pageSize) + v-* header
  │   ├─ authProvider           → /auth (login/refresh/logout), AUTH_MODE BEARER|COOKIE
  │   ├─ accessControlProvider  → capabilities[].roles × user roles → hides/disables
  │   ├─ tenantProvider         → tenant switch + context header (active only if tenancy.mode='multi')
  │   └─ override registry      → componentId → custom component
  └─ ui/      (shadcn)
      ├─ resource generator     → field spec → list / create / edit / show
      ├─ widget set             → input per type (enum/relation/richtext/image/…)
      └─ theme / layout / i18n
```

**Flow**: startup → manifest (fetch DEV / snapshot BUILD) → the engine builds the model and registers the
`<Resource>`s → the ui generates the screens from the field specs; where the manifest indicates a `componentId`, the registry
injects the override component.

**Zero-config rendering**: without overrides, from the manifest you get the sidebar (from `groups`+`resources`), table/card
lists (layout and columns **derived from the `fields`** in the absence of the `list`/`form` view blocks), detail with
standard layout, and the top-level **operation sections** (`Manifest.capabilities[]`) as dedicated pages/actions. The
view blocks in the overrides refine layout, columns, cards, form groups and order.

---

## 6. Override model

Two planes, from domain to presentation:

- **L1 — structural hints (BE, `routes.ts` config)**: domain. `resource.name/titleField/subtitleField/globalSearch`,
  `group`. No UI. They end up in the `generated`.
- **L2 — presentation overrides (admin, `manifest.overrides.ts` + props/plugin)**: UI. Four granularities, from the
  finest to the coarsest:
  1. **manifest tweak** — field reordering (via the order of the view block arrays), labels, allowlist of
     columns/fields, operators, form groups, cards. Zero React.
  2. **field widget** — `form.groups[].fields[].widget = "gallery-reorder"` → custom component for that input.
  3. **capability/action component** — `capability.component = "status-workflow"` for row/bulk/collection buttons.
  4. **view/page** — `views.edit = "vehicle-edit-custom"` or an extra page (dashboard/report) in the project router.

Furthermore L2 fills the **limits of schema-only**: `relation.kind`/`foreignKey`, `image` config, undeclared enums.

Principle: **80% OOTB from the manifest, 20% targeted overrides**. No project rewrites the CRUD base. The overrides are
**injected** (props `overrides/routes/theme/dictionaries` or `plugins`), never fork/monkey-patch.

---

## 7. Multi-tenant

- **single**: no switcher; `tenancy.mode = 'single'`.
- **multi**: topbar with a **tenant selector** (list from `tenancy.listEndpoint`, default `/tenants`); the chosen tenant
  defines the context of the `tenantScoped` resources. The global resources (`tenant`, sometimes `user`) stay out of
  scope. The backend isolates via `search_path`/`runInTenantContext` (never a global switch); the context header
  (`tenancy.header`, e.g. `x-tenant-id`) is injected by the `tenantProvider` on every request.

---

## 8. BE ↔ Admin split (coverage)

| Information | Source | Notes |
|---|---|---|
| resources, `path`, `name` | **BE** | from route + hint `resource.name` |
| fields, types, `required`, `validation` | **BE** | from JSON Schema (`$ref` collapse) |
| `filterable`/`sortable`/`operators`, `writeOnly` (semantic field capabilities) | **BE** | emitted with the field (DATA-only); the BE can restrict |
| enum-values | **BE** | only if present in the schema |
| `capabilities` (CRUD + actions) | **BE** | binding to real endpoints + `roles` |
| `roles` per capability | **BE** | declared; effective gating at runtime |
| `relation.resource` | **BE** | target |
| `relation.kind` / `foreignKey` | **Admin (override)** | not deducible from the schema |
| `image` config (accept/maxSize/storage/endpoints) | **Admin (override)** | the BE does not generate it |
| `group` (presence), `titleField`/`subtitleField` (fields) | **BE** | `config` hint, heuristic fallback |
| `group` label/icon/order, `titleField` i18n template | **Admin** | presentation |
| view block `list`/`form` (columns, cards, form groups, widgets, `colSpan`/`colStart`/`rowSpan`, order…) | **Admin (override)** | the BE **never** emits them: presentation + ordering |
| layouts, `defaults`, theming, dashboard, shortcuts, dictionaries | **Admin** | pure presentation |
| `globalSearch` (fields) | **BE** | hint `resource.globalSearch` |

---

## 9. Security model

- The build-time manifest is **full**: it lists all resources/capabilities with the **declared** `roles`.
- **Double gating**: the admin hides at runtime what the role cannot use; the **BE remains the authority** and rejects
  unauthorized calls on the endpoints anyway.
- **Graduated sensitive policy**: `password` excluded from read/list, allowed **write-only** in create/update;
  `token`/`mfaSecret`/`externalId` **always** excluded. Blacklist extensible via BE config.

---

## 10. Example (resource `vehicle`, v2)

```ts
{
  name: 'vehicle', path: 'vehicles',
  label: { singular: 'res.vehicle.singular', plural: 'res.vehicle.plural' },
  group: 'catalog', titleField: 'name', subtitleField: 'trimLevel', tenantScoped: true,
  capabilities: [
    { name: 'list',    kind: 'list',   method: 'GET',    path: '/vehicles',           roles: ['admin'] },
    { name: 'read',    kind: 'read',   method: 'GET',    path: '/vehicles/:id',       roles: ['admin'] },
    { name: 'create',  kind: 'create', method: 'POST',   path: '/vehicles',           roles: ['admin'] },
    { name: 'update',  kind: 'update', method: 'PUT',    path: '/vehicles/:id',       roles: ['admin'] },
    { name: 'delete',  kind: 'delete', method: 'DELETE', path: '/vehicles/:id',       roles: ['admin'], target: ['row', 'bulk'] },
    { name: 'publish', kind: 'action', method: 'PATCH',  path: '/vehicles/:id/status', roles: ['admin'],
      target: ['row', 'bulk'], payload: { status: 'published' }, visibleWhen: { status: { neq: 'published' } }, refresh: true },
    { name: 'archive', kind: 'action', method: 'PATCH',  path: '/vehicles/:id/status', roles: ['admin'],
      target: ['row', 'bulk'], payload: { status: 'archived' }, refresh: true }
  ],
  search: { fields: ['name', 'trimLevel', 'description', 'tag'], operator: 'containsi' },
  defaultSort: [{ field: 'importance', order: 'desc' }],
  // No presentation here: layouts/columns/cards/form groups live in the
  // `list`/`form` view blocks of the overrides (§2.5), never in the emitted manifest.
  fields: [ /* … DATA-only fields (name/type/enum/relation/image/validation +
               filterable/sortable/operators). lean 'brand' relation:
               { resource:'brand', titleField:'name' }; kind/foreignKey via override … */ ]
}
```

Presentation, **in the admin overrides** (never from the BE): ordered view blocks for `vehicle`.

```ts
resources: {
  vehicle: {
    list: {
      layouts: ['table', 'card'], defaultLayout: 'card',
      sort: ['importance', 'name'],
      table: { columns: [{ field: 'name' }, { field: 'brand' }, { field: 'status', align: 'center' }] },
      card: { maxWidth: 320, image: 'photos', title: 'name', subtitle: 'trimLevel',
              badges: ['status'], body: [{ field: 'monthlyVatExcl' }] }
    },
    form: {
      columns: 2,
      groups: [{ name: 'default', fields: [
        { field: 'name' }, { field: 'brand' },
        { field: 'status' }, { field: 'description', widget: 'rich-text', colSpan: 2 }
      ] }]
    }
  }
}
```

Standalone operation section (top-level `Manifest.capabilities[]`):

```ts
capabilities: [
  { name: 'rebuildSitemap', kind: 'action', method: 'POST', path: '/public/sitemap/rebuild',
    roles: ['admin'], label: 'op.sitemap.rebuild', icon: 'refresh', target: ['collection'], confirm: true }
]
```

---

## 11. Contract stress test — representative overrides

A compact way to check the contract is complete: a handful of non-trivial overrides that must all be expressible
without forking the engine. The ones that exercise it end to end:
`company` **singleton** (edit only) · **gallery-reorder** with cover + `altView` dropdown · **status workflow**
(`publish`/`archive` as `capabilities` `kind:'action'`) · **CSV export** (capability `kind:'action'`,
`target:['collection']`, `download`) · **image-single** (a logo field). All five are expressible with the overrides
described above — no engine fork.
