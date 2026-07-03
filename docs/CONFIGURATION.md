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

**The split is strict: the BE emits DATA + STRUCTURE only** — fields
(`name`/`type`/`enum`/`relation`/`image`/`validation`), capabilities, search,
defaultSort. It never emits presentation or i18n text. **All presentation and
ordering live in the overrides**, in *ordered view blocks* (`list`/`form`). This
is why the generated file is safe to overwrite on every regeneration.

Three configuration surfaces, in order of how often you touch them:

| Surface | Lives in | Scope |
|---|---|---|
| **Manifest overrides** | `src/manifest.overrides.ts` (`ManifestOverrides`) | Per-resource / per-field / per-capability tuning. **99% of your work.** |
| **`<VolcanicAdmin>` props** | app entry (`main.tsx`) | App-wide: theme, branding, i18n, custom widgets/views/pages, toast position, routing. |
| **Plugins** | bundles passed to `plugins={[…]}` | Same as props, packaged for reuse across repos. See CONSUMING.md §3. |

### Ordering & the allowlist rule

Because presentation is authored as **ordered arrays** (`table.columns`,
`card.body`, `form.groups[].fields`), **the array order IS the render order** — you
reorder a field by moving its entry. And a **present array is the authoritative
allowlist**: a field not listed does not appear in that view. When a block is
*absent*, the engine derives a sensible default from the resource fields (schema
order, non-heavy types visible).

> This replaces the old behavior where reordering had no effect (the merge was
> by-name and preserved the generated field order regardless of override order).

### Regenerate or not?

Overrides deep-merge onto the generated manifest **by name, at runtime in the
browser**. So:

- **No regeneration needed** for anything that patches an *existing* resource,
  field, or capability, or that (re)orders a view: labels, groups, widgets, card/
  table/form layout & order, enum colors, `filterable`/`sortable`, capability
  icons, `cloneReset`, etc. → just edit `manifest.overrides.ts`.
- **Regeneration needed** (`volcanic-admin-pull`, see CONSUMING.md §1.1) only when
  the **structure** changes on the BE: a new field, a new route/capability, a new
  resource. Regeneration also refreshes the `GeneratedFieldMap` type (see §12) that
  powers field-name type-checking.

---

## 2. `ManifestOverrides` (top level)

Defined in `src/engine/merge.ts`. Every key is optional. Generic over a field-map
(`ManifestOverrides<FM>`) for typed field names — see §12; the default is untyped.

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
| `cardDefaults` | `{ cardColumns?, cardMinWidth?, cardMaxWidth? }` | Card sizing applied to every resource with a card layout that sets **none** of its own card sizing. |
| `resources` | `Record<name, ResourceOverride>` | Patch resources by name (see §3). |
| `addResources` | `ResourceSpec[]` | Append resources absent from the generated manifest. |
| `excludeResources` | `string[]` | Drop resources from the panel (still live on the BE). |

**Sidebar groups** (`GroupSpec`): `{ name, label (i18n key), icon?, order? }`. The
`icon` is a mapped name — see [Icons](#8-icons).

---

## 3. `ResourceOverride` / `ResourceSpec`

`ResourceOverride` (in `merge.ts`) is `Partial<ResourceSpec>` minus `name`,
`fields`, `capabilities`, `list`, `form`, plus the field/capability patch helpers
and the two ordered view blocks. `ResourceSpec` (in
`src/engine/types/manifest.ts`) is the full resource shape. Everything below is
settable from `resources[name]`.

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
| `defaultSort` | `{ field, order }[]` | Initial sort. |
| `search` | `{ fields: string[], operator? }` | Presence enables the global search box (OR across `fields`, dot-notation allowed). |
| `clonable` | `boolean` | Show a "Clone" button on the detail view (opens create pre-filled). Defaults **true** wherever the resource has `create`; set `false` to hide. |
| `cloneReset` | `Record<string, unknown>` | Field values **forced** on a cloned record over the copied ones (e.g. `{ status: 'draft' }`). Keys are form field names — the *foreign key* for relations. |
| `views` | `{ list?, create?, edit?, show? }` | Each is `'auto'` or a **componentId** registered via `overrides.view` / a plugin. Replaces the default generator for that screen. |

**Clone behavior:** the seed copies every writable form field of the source record;
it **skips** read-only fields and image/file fields with their own upload endpoints
(binaries aren't cloned by copying values). Relations map to their foreign key. The
user reviews and saves, so unique fields (e.g. name) are corrected before insert.

### 3.2 Collection view — `list` (`ListViewSpec`)

The list screen has a shared toolbar (search / sort / filter / pagination) plus two
interchangeable **layouts**: a `table` and a `card` grid.

```ts
list: {
  layouts?: ('table' | 'card')[]     // >1 → a layout toggle appears in the header
  defaultLayout?: 'table' | 'card'   // falls back to layouts[0], else 'table'
  sort?: string[]                    // "sort by" options, in order (a relation
                                     //   tie-breaks by the row title). Absent →
                                     //   the sortable fields.
  table?: { columns?: ColumnSpec[] } // ordered allowlist of columns
  card?: CardViewSpec                // card-grid layout + field slots
}
```

**`ColumnSpec`** — a table column referencing a field by name + table-only
presentation:

| Key | Type | Notes |
|---|---|---|
| `field` | `string` | Field name. Required. |
| `label` | i18n key | Per-view header override (falls back to the field label / `field.<res>.<name>`). |
| `align` | `'left' \| 'center' \| 'right'` | Column alignment. |
| `width` | `number` | Column width px. |

> `columns` present → **only** the listed columns show, in that order (allowlist).
> Absent → derived: non-heavy, non-write-only fields in declaration order. A column
> is sortable when the field is `sortable` (default true for non-relation/json).

**`CardViewSpec`** — the card grid. Two mutually-exclusive sizing modes: **fixed
columns** (`columns`) or **fluid width** (setting `maxWidth` switches to fluid — it
wins over `columns`).

| Key | Type | Notes |
|---|---|---|
| `minWidth` | `number` | Fluid mode: min card px width (default 240). |
| `maxWidth` | `number` | Fluid mode: max card px width. **Setting this enables fluid mode** — cards auto-fill/wrap, capped, centered. |
| `columns` | `number` | Fixed max columns (responsive up to this; default 3). Ignored if `maxWidth` set. |
| `align` | `'left' \| 'center'` | Card content alignment (title/subtitle/chips). Default `left`. |
| `highlight` | `string` (field) | Boolean field → "featured" card (accent ring + ⭐ badge). |
| `image` | `string` (field) | Image field for the cover carousel. Default: first image field. |
| `title` | `string \| string[]` (field(s)) | Card title. Default: resource `titleField`. Array → space-joined. |
| `subtitle` | `string \| string[]` (field(s)) | Card subtitle. Default: resource `subtitleField`. |
| `badges` | `string[]` (fields) | Enum fields rendered as chips, in order. Default: the enum fields among the columns. |
| `body` | `CardBodySpec[]` | Extra labeled info rows, in order. |

**`CardBodySpec`**: `{ field, label? }` — a labeled key/value row in the card body.

> The card slots are **explicit** now (there is no auto-detected "primary numeric
> field" — put such a value in `body`). Every slot is optional and falls back as
> noted above, so a bare `card: {}` still renders title/subtitle/badges from
> defaults.

### 3.3 Form (create/edit) + show — `form` (`FormViewSpec`)

The form and the read-only show view share this block for layout coherence.

```ts
form: {
  columns?: number                   // default grid columns 1–4 (default 2)
  groups?: {                         // ordered sections
    name: string                     //   'default' → rendered headerless
    label?: string                   //   i18n key (falls back to group.<name>)
    columns?: number                 //   override the form default for this group
    fields: FormFieldSpec[]          //   ordered allowlist of fields
  }[]
}
```

**`FormFieldSpec`** — a field placed in a group + form-only presentation:

| Key | Type | Notes |
|---|---|---|
| `field` | `string` | Field name. Required. |
| `label` | i18n key | Per-view label override. |
| `widget` | `string` | Widget id — see §7. `'auto'` or a registered/built-in id. |
| `colSpan` | `number` | Columns the field spans in the grid (capped at the group/form columns). `image`/`richtext` always span the full row. |
| `colStart` | `number` | Force the field to start at this **1-based** grid column (md+, capped at the grid width). Leaves the earlier cells of the row empty and breaks to the next row when that column is already taken — used to align columns / break a row deliberately. |
| `rowSpan` | `number` | Make the field span this many grid **rows** (md+) — e.g. a tall textarea sitting beside several stacked single-row fields in another column. |
| `visibleOn` | `'create' \| 'edit'` | Restrict to one mode (omitted = both). |
| `placeholder` | i18n key | |
| `suggestions` | `(string \| number)[]` | Non-binding suggestions for the `combobox` widget (editable dropdown). |

> `groups` present → **only** the listed fields show, grouped and ordered as
> written (allowlist). Absent → a single headerless `default` section with all
> fields in declaration order.

### 3.4 Fields & capabilities (patch helpers)

| Key | Type | Notes |
|---|---|---|
| `fields` | `Record<name, FieldOverride>` | Patch a field's **intrinsics** by name (deep-merge). See §4. |
| `addFields` | `FieldSpec[]` | Add fields absent from the generated manifest. |
| `excludeFields` | `string[]` | Remove fields by name. |
| `capabilities` | `Record<name, CapabilityOverride>` | Patch a capability by name (deep-merge); **unknown names are added**. See §5. |
| `excludeCapabilities` | `string[]` | Remove capabilities by name. |

---

## 4. `FieldOverride` / `FieldSpec`

A field is **DATA + STRUCTURE only** — the intrinsic semantics of the field,
shared by every view. Presentation and ordering are NOT here; they live in the
`list`/`form` view blocks (§3.2/§3.3). `FieldSpec`:

| Key | Type | Notes |
|---|---|---|
| `type` | `FieldType` | `string`, `text`, `textarea`, `richtext`, `integer`, `number`, `boolean`, `date`, `datetime`, `enum`, `relation`, `email`, `url`, `uuid`, `json`, `image`, `file`. `textarea` = plain multi-line; `richtext` = HTML rich-text editor. |
| `label` | i18n key | Default label for all views (a view entry may override it). |
| `required` | `boolean` | Client `required` rule + `*` marker. |
| `readOnly` | `boolean` | Excluded from the write payload; shown read-only. |
| `writeOnly` | `boolean` | Present in the write body, never read/listed (e.g. password). Excluded from table columns and bulk export/import. |
| `nullable` | `boolean` | |
| `default` | `unknown` | Create-form default value. |
| `help` | i18n key | Helper text under the input. |
| `enum` | `EnumOption[]` | Inline options (alternative to `enumRef`). |
| `enumRef` | `string` | Reference a shared enum in `Manifest.enums`. |
| `relation` | `RelationSpec` | See §4.1. |
| `image` | `ImageSpec` | See §4.2. |
| `validation` | `ValidationSpec` | See §4.3. |
| **capabilities** | | *(semantic, shared by table + card + filters)* |
| `filterable` | `boolean` | Enable in the Filters panel (Dialog). |
| `sortable` | `boolean` | Sortable (table header + "sort by"). Default: true for non-relation/json. |
| `operators` | `FilterOperator[]` | Which operators the filter offers (see §6). |

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

### 4.4 `EnumOption` + color palette

`{ value, label (i18n key), color? }`. A **named** `color` renders a soft colored
chip; any other value → neutral chip + color dot. Named palette (from
`display.tsx`):

`slate` · `gray` · `red` · `orange` · `amber` · `yellow` · `green` · `emerald` ·
`teal` · `blue` · `indigo` · `violet` · `purple` · `pink` · `rose`

> **The field carries no `list`/`form` presentation object.** Column alignment/width
> live on `ColumnSpec` (§3.2), widget/colSpan/colStart/rowSpan/group live on
> `FormFieldSpec` (§3.3),
> and "is this a column / in the form" is decided by *membership* in those ordered
> arrays (the allowlist rule) — not by a `visible` flag.

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

- **Filters** (`field.filterable`) open a Dialog; all conditions are combined with
  **AND**. Operator UI by type: enum/relation → multi-select `IN`; boolean →
  Yes/No/All (`eq`); number/date → range min–max (`ge`/`le`). Restrict offered
  operators with `field.operators`.
- **Sort**: `list.sort` drives a "sort by" select + a ↑/↓ direction icon button.
  Absent → the sortable fields (`field.sortable`).
- **Search**: `search.fields` enables a global OR search box.
- **Operators available** (`FilterOperator`): `eq`, `neq`, `contains`, `containsi`,
  `ncontains`, `ncontainsi`, `starts`, `startsi`, `ends`, `endsi`, `gt`, `ge`,
  `lt`, `le`, `between`, `in`, `nin`, `null`, `notNull`. (`raw` is never exposed.)

---

## 7. Widgets

**Selection order** (`pickWidget` in `src/ui/widgets/inputs.tsx`):

1. Registry **override** matching the form entry's `widget` (from `overrides.widget`
   / a plugin).
2. A **built-in-by-name** widget matching `widget`.
3. The **type default**.

An unknown `widget` id silently falls back to the type default.

**Built-in widget ids** (selectable via a `form.groups[].fields[].widget`):

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
> then reference them by id in a form entry's `widget`.

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
| `loginLogo` | `string` | `logo` | Login hero logo (usually bigger/richer than the sidebar mark). |
| `loginLogoDark` | `string` | — | Dark-theme variant of the login logo (CSS-swapped by `.dark`). Use when a light logo is unreadable on dark. |
| `loginLogoHeight` | `number` | `56` | Login logo height px. |
| `loginLogoMaxWidth` | `number` | `260` | Login logo max width px. |
| `poweredBy` | `boolean` | `true` | Show the theme-aware "powered by Volcanic Minds" signature on the login (bottom-right). Set `false` to hide (white-label). |

The login page is inside the `ThemeProvider` and uses theme tokens, so it renders
in **both light and dark** (follows the OS unless the user picks a mode). The VM
signature and `loginLogoDark` swap variants via the `.dark` class (CSS-only).

**`AdminTheme`** — CSS-variable tokens injected at the root (no Tailwind config
needed). Colors are **HSL channels** (e.g. `"221 83% 53%"`). Tokens: `background`,
`foreground`, `card(+Foreground)`, `popover(+Foreground)`, `primary(+Foreground)`,
`secondary(+Foreground)`, `muted(+Foreground)`, `accent(+Foreground)`,
`destructive(+Foreground)`, `border`, `input`, `ring`, `radius` (any CSS length).
A nested `dark` object overrides tokens under the `.dark` class.

---

## 12. Typed field names — `ManifestOverrides<GeneratedFieldMap>`

`volcanic-admin-pull` emits, alongside the generated manifest, a **field map** type:

```ts
// manifest.generated.ts (AUTO-GENERATED)
export type GeneratedFieldMap = {
  vehicle: 'id' | 'status' | 'name' | 'brand' | 'monthlyVatExcl' | …
  brand: 'id' | 'name' | 'logoUrl' | …
  …
}
```

Type the overrides against it and **every field reference is checked at compile
time** — `field:` in columns/form entries, `card` slots (`image`/`title`/`badges`/…),
`sort`, `excludeFields`, and the `fields` keys — with "did you mean" suggestions:

```ts
import type { ManifestOverrides } from '@volcanicminds/admin'
import type { GeneratedFieldMap } from './manifest.generated'

export const overrides: ManifestOverrides<GeneratedFieldMap> = { … }
```

A mistyped field name is a compile error instead of silently vanishing from the
view (the allowlist would just skip it). The generic defaults to `string`, so
untyped overrides keep working, and the runtime merge is unaffected (generics are
erased at the `mergeManifest`/`<VolcanicAdmin>` boundary). Regenerate after any BE
schema change to keep the map current. (Field-**name** typos are caught; typos in
the top-level *resource* keys of `resources` are not strictly rejected.)

---

## 13. Known drift / gotchas

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
- After editing the engine and rebuilding its `dist`, a consuming app's Vite cache
  must be cleared to pick it up: `rm -rf node_modules/.vite && npm run dev`.

---

## Keeping this in sync

This document is a **maintained mirror** of the config surface. When you change any
of these, update the matching section here in the **same PR**:

| Area | Source of truth |
|---|---|
| Manifest types (Resource/Field/Capability/Enum/Image + view blocks) | `src/engine/types/manifest.ts` |
| Override surface + merge semantics + `FieldMap` generic | `src/engine/merge.ts` |
| Interpreted model (columns/card/form projection, allowlist/derive) | `src/engine/interpreter.ts` + `src/engine/types/model.ts` |
| `GeneratedFieldMap` codegen + overrides scaffold | `scripts/pull-manifest.mjs` |
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
| Table columns / card slots / form sections rendering | `src/ui/generators/{ListTable,ListCards,AutoForm,ShowView,layout}.tsx` |
| Filters / sort / search behavior | `src/ui/generators/{FilterBar,ListView}.tsx` |

See also: [`CONSUMING.md`](./CONSUMING.md) (setup, plugins, dev workflow),
`MANIFEST_DESIGN.md` (manifest v2 contract).
