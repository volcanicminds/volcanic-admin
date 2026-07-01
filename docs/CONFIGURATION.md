# Configuration reference — `@volcanicminds/admin`

> **Exhaustive map of every configuration knob the engine currently exposes.**
> This is the *reference*; for the setup/plugin mechanics (how to pull the
> manifest, register widgets/views, ship plugins) see [`CONSUMING.md`](./CONSUMING.md).
>
> **Source of truth = code.** This document mirrors the types and behaviors in the
> files listed under [Keeping this in sync](#keeping-this-in-sync). If code and doc
> disagree, the code wins — and the doc is the thing to fix.

---

## 1. Mental model

The admin UI is fully **generated from a manifest** (`GET /admin/manifest`, emitted
by a `@volcanicminds/backend` app) and **customized by a hand-edited overrides
patch**. Nothing about the UI is written by hand per screen; you *tune* the
generated model.

```
BE schema ──emit──► manifest.generated.ts   (AUTO-GENERATED, never hand-edit)
                          │
      manifest.overrides.ts  (yours — merged by name at runtime)
                          │
                   mergeManifest()  ──► interpreted model ──► React views
```

Three configuration surfaces, in order of how often you touch them:

| Surface | Lives in | Scope |
|---|---|---|
| **Manifest overrides** | `src/manifest.overrides.ts` (`ManifestOverrides`) | Per-resource / per-field / per-capability tuning. **99% of your work.** |
| **`<VolcanicAdmin>` props** | app entry (`main.tsx`) | App-wide: theme, branding, i18n, custom widgets/views/pages, toast position, routing. |
| **Plugins** | bundles passed to `plugins={[…]}` | Same as props, packaged for reuse across repos. See CONSUMING.md §3. |

### Regenerate or not?

Overrides deep-merge onto the generated manifest **by name, at runtime in the
browser**. So:

- **No regeneration needed** for anything that patches an *existing* resource,
  field, or capability: labels, groups, widgets, card/detail layout, enum colors,
  filterable/sortable flags, capability icons, `cloneReset`, etc. → just edit
  `manifest.overrides.ts`.
- **Regeneration needed** (`volcanic-admin-pull`, see CONSUMING.md §1.1) only when
  the **structure** changes on the BE: a new field/column, a new route/capability,
  a new resource. The generated file carries an `AUTO-GENERATED — do not edit`
  header.

---

## 2. `ManifestOverrides` (top level)

Defined in `src/engine/merge.ts`. Every key is optional.

```ts
export const overrides: ManifestOverrides = { … }
```

| Key | Type | Merge semantics |
|---|---|---|
| `i18n` | `Partial<{ defaultLocale, locales }>` | Shallow patch. |
| `auth` | `Partial<{ mode, endpoints }>` | Deep-merge. |
| `tenancy` | `Partial<{ mode, switchable, header, listEndpoint }>` | Shallow patch. |
| `enums` | `Record<string, EnumOption[]>` | Replaces the named shared enum. |
| `groups` | `GroupSpec[]` | Merge by `name`, append new. Sidebar sections. |
| `cardDefaults` | `{ cardColumns?, cardMinWidth?, cardMaxWidth? }` | Applied to every resource that does **not** define its own card layout. |
| `resources` | `Record<name, ResourceOverride>` | Patch resources by name (see §3). |
| `addResources` | `ResourceSpec[]` | Append resources absent from the generated manifest. |
| `excludeResources` | `string[]` | Drop resources from the panel (still live on the BE). |

**Sidebar groups** (`GroupSpec`): `{ name, label (i18n key), icon?, order? }`. The
`icon` is a mapped name — see [Icons](#8-icons).

---

## 3. `ResourceOverride` / `ResourceSpec`

`ResourceOverride` (in `merge.ts`) is `Partial<ResourceSpec>` minus `name`,
`fields`, `capabilities`, plus the field/capability patch helpers. `ResourceSpec`
(in `src/engine/types/manifest.ts`) is the full resource shape. Everything below
is settable from `resources[name]`.

### 3.1 Identity & routing

| Key | Type | Notes |
|---|---|---|
| `icon` | `string` | Sidebar icon (mapped name, see §8). |
| `group` | `string` | Sidebar group name. |
| `order` | `number` | Sort order within the group. |
| `idField` | `string` | Primary key field (default `id`). |
| `titleField` | `string \| string[]` | Field(s) for record titles/references; an array is space-joined. |
| `subtitleField` | `string \| string[]` | Secondary display field(s). |
| `label` | `{ singular, plural }` | i18n keys. Usually auto-emitted. |
| `singleton` | `boolean` | One fixed record (no list/:id); renders `SingletonView`. |
| `tenantScoped` | `boolean` | Row belongs to a tenant (multi-tenant). |
| `softDelete` | `boolean` | Delete is a soft-delete on the BE. |

### 3.2 List view

| Key | Type | Notes |
|---|---|---|
| `listLayouts` | `('table' \| 'card')[]` | When >1, a layout toggle appears in the list header. |
| `defaultListLayout` | `'table' \| 'card'` | Falls back to first of `listLayouts`, else `table`. |
| `defaultSort` | `{ field, order }[]` | Initial sort. |
| `sortOptions` | `string[]` | Fields offered in the "sort by" control (a select + ↑/↓ icon button). A relation tie-breaks by the row title. Falls back to sortable columns. |
| `search` | `{ fields: string[], operator? }` | Presence enables the global search box (OR across `fields`, dot-notation allowed). |

### 3.3 Card grid (card layout only)

Two mutually-exclusive sizing modes: **fixed columns** or **fluid width**
(setting `cardMaxWidth` switches to fluid — it wins over `cardColumns`).

| Key | Type | Notes |
|---|---|---|
| `cardColumns` | `number` | Fixed max columns (responsive up to this; default 3). Ignored if `cardMaxWidth` set. |
| `cardMinWidth` | `number` | Fluid mode: min card px width (default 240). |
| `cardMaxWidth` | `number` | Fluid mode: max card px width. **Setting this enables fluid mode** — cards auto-fill/wrap, capped, centered. |
| `cardAlign` | `'left' \| 'center'` | Card content alignment (title/subtitle/chips). Default `left`. |
| `cardFields` | `string[]` | Extra fields rendered as labeled info rows on the card. |
| `highlightField` | `string` | Boolean field → "featured" card (accent ring + ⭐ badge). |

### 3.4 Detail (show) & form (create/edit)

| Key | Type | Notes |
|---|---|---|
| `detailColumns` | `number` | Grid columns (1–4, default 2) for **both** ShowView and AutoForm (layout coherence). `image`/`richtext` and `form.colSpan` fields still span full width. |
| `clonable` | `boolean` | Show a "Clone" button on the detail view (opens create pre-filled). Defaults **true** wherever the resource has `create`; set `false` to hide. |
| `cloneReset` | `Record<string, unknown>` | Field values **forced** on a cloned record over the copied ones (e.g. `{ status: 'draft' }`). Keys are form field names — the *foreign key* for relations. |

**Clone behavior:** the seed copies every writable form field of the source record;
it **skips** read-only fields and image/file fields with their own upload endpoints
(binaries aren't cloned by copying values). Relations map to their foreign key. The
user reviews and saves, so unique fields (e.g. name) are corrected before insert.

### 3.5 View component overrides

| Key | Type | Notes |
|---|---|---|
| `views` | `{ list?, create?, edit?, show? }` | Each is `'auto'` or a **componentId** registered via `overrides.view` / a plugin. Replaces the default generator for that screen. |

### 3.6 Fields & capabilities (patch helpers)

| Key | Type | Notes |
|---|---|---|
| `fields` | `Record<name, FieldOverride>` | Patch a field by name (deep-merge). See §4. |
| `addFields` | `FieldSpec[]` | Add fields absent from the generated manifest. |
| `excludeFields` | `string[]` | Remove fields by name. |
| `capabilities` | `Record<name, CapabilityOverride>` | Patch a capability by name (deep-merge); **unknown names are added**. See §5. |
| `excludeCapabilities` | `string[]` | Remove capabilities by name. |

---

## 4. `FieldOverride` / `FieldSpec`

A field patch fills what the schema-only generator can't infer. `FieldSpec`:

| Key | Type | Notes |
|---|---|---|
| `type` | `FieldType` | `string`, `text`, `textarea`, `richtext`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum`, `relation`, `email`, `url`, `uuid`, `json`, `image`, `file`. `textarea` = plain multi-line; `richtext` = HTML rich-text editor. |
| `label` | i18n key | |
| `required` | `boolean` | Client `required` rule + `*` marker. |
| `readOnly` | `boolean` | Excluded from the write payload; shown read-only. |
| `nullable` | `boolean` | |
| `default` | `unknown` | Create-form default value. |
| `help` | i18n key | Helper text under the input. |
| `enum` | `EnumOption[]` | Inline options (alternative to `enumRef`). |
| `enumRef` | `string` | Reference a shared enum in `Manifest.enums`. |
| `relation` | `RelationSpec` | See §4.1. |
| `image` | `ImageSpec` | See §4.2. |
| `validation` | `ValidationSpec` | See §4.3. |
| `list` | `FieldListSpec` | See §4.4. |
| `form` | `FieldFormSpec` | See §4.5. |

### 4.1 `RelationSpec`

| Key | Type | Notes |
|---|---|---|
| `resource` | `string` | Target resource name. |
| `kind` | `'many-to-one' \| 'one-to-many' \| 'many-to-many'` | BE emits this "magro" — often filled here. |
| `titleField` | `string` | Field used to label options (also drives sort/tie-break). |
| `foreignKey` | `string` | The **writable key** the form binds to (e.g. `brandId`). The relation object itself is output-only. |
| `inverse` | `string` | Inverse side name. |

> The interpreter makes a relation field inherit `readOnly`/`required` from its
> `foreignKey` — necessary because the relation object is output-only.

### 4.2 `ImageSpec` (`type: 'image' \| 'file'`)

| Key | Type | Notes |
|---|---|---|
| `multiple` | `boolean` | Gallery vs single. |
| `ordered` | `boolean` | Drag-to-reorder gallery. |
| `fit` | `'cover' \| 'contain'` | Preview fit: `cover` fills/crops (photos, default); `contain` shows the whole image + padding (logos). |
| `cover` | `'first' \| 'flag'` | `first` → first image is the cover; `flag` → per-image `isCover`. |
| `altField` | `string` | Field holding alt text. |
| `accept` | `string[]` | Accepted MIME types. |
| `maxSize` | `number` | Max bytes. |
| `endpoints` | `{ upload?, reorder?, update?, remove? }` | Each `{ method, path }`. **Presence of `upload` enables real REST multipart upload + DnD**, and the field is managed out-of-band → **excluded from the form body**. |
| `storage` | `'folder' \| 's3' \| string` | Storage backend hint. |

### 4.3 `ValidationSpec`

`required`, `min`, `max`, `minLength`, `maxLength`, `pattern`, `step`. Turned into
react-hook-form rules (`toRules`); messages fall back to `validation.required` etc.

### 4.4 `FieldListSpec` (`field.list`)

| Key | Type | Notes |
|---|---|---|
| `visible` | `boolean` | Show as a table column. Heavy types are hidden by default. |
| `sortable` | `boolean` | Sortable column. |
| `filterable` | `boolean` | Enable in the Filters panel (Dialog). |
| `operators` | `FilterOperator[]` | Which operators the filter offers (see §6). |
| `width` | `number` | Column width px. |
| `align` | `'left' \| 'center' \| 'right'` | Column alignment. |

### 4.5 `FieldFormSpec` (`field.form`)

| Key | Type | Notes |
|---|---|---|
| `visible` | `boolean` | Show in the form (default true). |
| `visibleOn` | `'create' \| 'edit'` | Restrict to one mode (omitted = both). |
| `widget` | `string` | Widget id — see §7. `'auto'` or a registered/built-in id. |
| `group` | `string` | Section grouping in the form/detail (`group.<name>` i18n key as header). |
| `colSpan` | `number` | Columns the field spans within the detail/form grid (capped at `detailColumns`). |
| `placeholder` | i18n key | |
| `suggestions` | `(string \| number)[]` | Non-binding suggestions for the `combobox` widget (editable dropdown). |

### 4.6 `EnumOption` + color palette

`{ value, label (i18n key), color? }`. A **named** `color` renders a soft colored
chip; any other value → neutral chip + color dot. Named palette (from
`display.tsx`):

`slate` · `gray` · `red` · `orange` · `amber` · `yellow` · `green` · `emerald` ·
`teal` · `blue` · `indigo` · `violet` · `purple` · `pink` · `rose`

---

## 5. Capabilities & actions (`CapabilitySpec`)

A capability is an executable verb bound to a real endpoint, with its own roles.
The same shape covers **CRUD verbs** (`list`/`read`/`create`/`update`/`delete`)
and **custom actions** (`kind: 'action'`), both inside a resource
(`resources[name].capabilities`) and at the manifest top level (standalone
operation sections).

| Key | Type | Notes |
|---|---|---|
| `name` | `string` | Unique within scope. |
| `kind` | `'list'\|'read'\|'create'\|'update'\|'delete'\|'action'` | |
| `method` | `'GET'\|'POST'\|'PUT'\|'PATCH'\|'DELETE'` | |
| `path` | `string` | Endpoint binding; supports `:param` interpolation from the row. |
| `roles` | `string[]` | Declared authorization (runtime gating + BE enforcement). |
| `enabled` | `boolean` | |
| **action-only** | | |
| `label` | i18n key | Button label. |
| `icon` | `string` | Action icon (mapped set, see §8). |
| `target` | `('row'\|'bulk'\|'collection')[]` | Where the button surfaces (row = compact icon; collection = labeled header button). |
| `payload` | `Record<string, unknown>` | Static body merged into the request. |
| `confirm` / `confirmText` | `boolean` / i18n key | Confirm dialog before running. |
| `input` | `{ fields: ActionInputField[], submitLabel? }` | Prompt for fields in a dialog, send as body (e.g. set-password). |
| `visibleWhen` | `Record<field, Record<op, value>>` | Row condition controlling visibility. |
| `refresh` | `boolean` | After success, invalidate list/detail → refetch (no full reload). Default on. |
| `download` | `string` | MIME type when the action returns a file (triggers browser download; `csv` → CSV). |
| `component` | `string \| null` | Override registry id for a custom action button; null → generic handler. |

`ActionInputField`: `{ name, label?, type?, widget?, required?, placeholder? }`.

---

## 6. Filters, sort, search

- **Filters** (`field.list.filterable`) open a Dialog; all conditions are combined
  with **AND**. Operator UI by type: enum/relation → multi-select `IN`; boolean →
  Yes/No/All (`eq`); number/date → range min–max (`ge`/`le`). Restrict offered
  operators with `field.list.operators`.
- **Sort**: `sortOptions` drives a "sort by" select + a ↑/↓ direction icon button.
- **Search**: `search.fields` enables a global OR search box.
- **Operators available** (`FilterOperator`): `eq`, `neq`, `contains`, `containsi`,
  `ncontains`, `ncontainsi`, `starts`, `startsi`, `ends`, `endsi`, `gt`, `ge`,
  `lt`, `le`, `between`, `in`, `nin`, `null`, `notNull`. (`raw` is never exposed.)

---

## 7. Widgets

**Selection order** (`pickWidget` in `src/ui/widgets/inputs.tsx`):

1. Registry **override** matching `field.form.widget` (from `overrides.widget` /
   a plugin).
2. A **built-in-by-name** widget matching `field.form.widget`.
3. The **type default**.

An unknown `widget` id silently falls back to the type default.

**Built-in widget ids** (selectable via `field.form.widget`):

| id | Component | Source |
|---|---|---|
| `multiselect` | MultiSelectWidget | `inputs.tsx` (`BUILTIN_WIDGETS`) |
| `combobox` | ComboboxWidget (editable select + `suggestions`) | `inputs.tsx` |
| `image-single` | ImageSingle (upload) | `widgets/upload` (`defaultWidgets`) |
| `gallery-reorder` | GalleryReorder (upload + DnD) | `widgets/upload` |
| `rich-text` | RichTextWidget (TipTap editor, HTML output, **lazy-loaded**) | `widgets/richtext` |

**Type → default widget** (when no `widget` id resolves):

| Field type | Widget |
|---|---|
| `relation` | ReferenceSelect (server-sorted by `titleField`) |
| `text`, `textarea` | Textarea (plain multi-line) |
| `richtext` | RichTextWidget (TipTap editor, HTML) — falls back to Textarea if unregistered |
| `integer`, `number` | Number |
| `boolean` | Switch |
| `enum` | Select |
| `date`, `datetime` | Date |
| `json` | JSON editor |
| `image`, `file` | Image/upload |
| everything else | Text input |

> Register your own widgets via `overrides.widget` or a plugin (CONSUMING.md §3.1),
> then reference them by id in `field.form.widget`.

---

## 8. Icons

Two independent mapped sets (unknown names fall back gracefully; **not** arbitrary
lucide names).

- **Sidebar / resource / group icons** (`src/ui/layout/icons.tsx`):
  `car`, `layers`, `users`, `mail`, `cog`, `building`, `tag`, `boxes`, `file`,
  `image`, `cart`. Unknown → first-letter badge / neutral dot.
- **Action icons** (`src/ui/actions/ActionButtons.tsx`):
  `check`, `archive`, `download`, `refresh`, `send`, `star`, `star-off`. Unknown →
  `Zap` fallback.

To add an icon name, extend the relevant map in code.

---

## 9. i18n

The manifest emits **keys only** (`res.*`, `field.*`, `enum.*`, `action.*`,
`group.*`, `meta.*`). The project supplies dictionaries (`dictionaries` prop /
plugin). A **missing key is humanized** (last segment title-cased) rather than
shown raw.

**Reserved default keys** shipped in `defaultDictionaries` (en/it) — override as
needed:

- `error.*`: `unique`, `reference`, `required`, `forbidden`, `notFound`,
  `conflict`, `generic` (used by `classifyBackendError` to humanize BE errors).
- `meta.*`: `id`, `createdAt`, `updatedAt`.
- `action.*`: `copy`, `clone`, `remove` (plus view-level `back`, `edit`, `save`,
  `cancel`, `delete`, `delete.confirmTitle`, `delete.confirmText`, `confirm`).
- `badge.featured`, `upload.*`, `sort.*` (`by`, `asc`, `desc`, `clear`),
  `filter.*` (`title`, `clear`, `any`, `yes`, `no`, `min`, `max`).

---

## 10. `<VolcanicAdmin>` props (config-relevant)

Full list in `src/VolcanicAdmin.tsx` (`VolcanicAdminProps`) and CONSUMING.md §4.
The ones that shape configuration:

| Prop | Type | Notes |
|---|---|---|
| `apiUrl` | `string` | BE base URL (manifest + CRUD). |
| `apiBasePath` | `string` | CRUD base path. Default `/admin` (generic CRUD); set `''` for hand-written routes. |
| `authMode` | `'cookie' \| 'bearer'` | Defaults to `manifest.auth.mode`. |
| `basename` | `string` | Router basename when mounted under a sub-path. |
| `manifestOverrides` | `ManifestOverrides` | §2 — the main tuning surface. |
| `overrides` | `{ widget?, view?, action? }` | Component overrides keyed by manifest componentId. |
| `plugins` | `AdminPlugin[]` | Composable bundles (widgets/views/actions/routes/i18n/theme/branding). |
| `dictionaries` / `defaultLocale` / `locales` | i18n | |
| `theme` | `AdminTheme` | CSS-variable tokens (see §11). |
| `branding` | `AdminBranding` | Logo + app name (see §11). |
| `routes` | `AdminCustomRoute[]` | Extra pages/dashboards (+ optional sidebar entry). |
| `toastPosition` | `top/bottom × left/center/right` | Default `bottom-right` (keeps the top-right action area clear). |
| `dataProvider` / `authClient` / `loadManifest` / `manifest` / `fetchTenants` | overrides | For mocks / static manifest / custom loaders. |

### `AdminPlugin`

`{ name?, widgets?, views?, actions?, routes?, dictionaries?, theme?, branding? }` —
author with `defineAdminPlugin()`. See CONSUMING.md §3.5.

---

## 11. Branding & theme

**`AdminBranding`** (`src/ui/config.tsx`):

| Key | Type | Default | Notes |
|---|---|---|---|
| `appName` | `string` | `'Volcanic Admin'` | Sidebar header, login title, fallback badge initial. |
| `logo` | `string` | — | Expanded-sidebar + login logo (replaces badge + wordmark). |
| `logoCollapsed` | `string` | — | Mark for the collapsed sidebar (falls back to initial badge). |
| `logoHeight` | `number` | `28` | Expanded logo height px. |
| `logoMaxWidth` | `number` | `170` | Expanded logo max width px. |

**`AdminTheme`** — CSS-variable tokens injected at the root (no Tailwind config
needed). Colors are **HSL channels** (e.g. `"221 83% 53%"`). Tokens: `background`,
`foreground`, `card(+Foreground)`, `popover(+Foreground)`, `primary(+Foreground)`,
`secondary(+Foreground)`, `muted(+Foreground)`, `accent(+Foreground)`,
`destructive(+Foreground)`, `border`, `input`, `ring`, `radius` (any CSS length).
A nested `dark` object overrides tokens under the `.dark` class.

---

## 12. Known drift / gotchas

- **Rich text** (`type: 'richtext'`) renders the built-in TipTap editor and stores
  **HTML**. The read-only view renders that HTML inside `.prose` (Tailwind
  Typography, shipped in the engine's `style.css` via the preset). The editor
  chunk is **lazy-loaded** — ProseMirror only ships to apps that use it. Content is
  produced from a constrained schema (no `<script>`); if you point the admin at an
  untrusted backend, still sanitize server-side (or wrap the display in DOMPurify).
- `mutationMode` is globally `optimistic` (Refine); capability actions
  invalidate → refetch. Do **not** use `useQueryClient` from `@tanstack` inside the
  engine (dual-instance with Refine v4 → "No QueryClient set").
- Relative storage URLs (`/media/...`) are resolved against the API origin via
  `absoluteUrl(apiUrl, url)`.

---

## Keeping this in sync

This document is a **maintained mirror** of the config surface. When you change any
of these, update the matching section here in the **same PR**:

| Area | Source of truth |
|---|---|
| Manifest types (Resource/Field/Capability/Enum/Image/…) | `src/engine/types/manifest.ts` |
| Override surface + merge semantics | `src/engine/merge.ts` |
| `<VolcanicAdmin>` props, plugins, theme tokens | `src/VolcanicAdmin.tsx` |
| Branding & nav item | `src/ui/config.tsx` |
| Widget selection + built-in-by-name ids | `src/ui/widgets/inputs.tsx` |
| Built-in widget registry (merged) | `src/ui/widgets/defaults.ts` |
| Upload widgets | `src/ui/widgets/upload/index.ts` |
| Rich-text editor (TipTap, lazy) | `src/ui/widgets/richtext/*` + `tailwind-preset.js` (typography) |
| Enum color palette | `src/ui/widgets/display.tsx` |
| Sidebar/resource icons | `src/ui/layout/icons.tsx` |
| Action icons | `src/ui/actions/ActionButtons.tsx` |
| Default i18n keys | `src/engine/i18n.tsx` |
| Detail/form column layout + clone | `src/ui/generators/{ShowView,AutoForm,layout}.tsx` |
| Filters / sort / search behavior | `src/ui/generators/{FilterBar,ListView}.tsx` |

See also: [`CONSUMING.md`](./CONSUMING.md) (setup, plugins, dev workflow),
`MANIFEST_DESIGN.md` (manifest v2 contract).
