# Consuming `@volcanicminds/admin`

How to build a client backoffice on top of the manifest-driven engine.

> For the **exhaustive per-field/per-resource/per-capability config reference**
> (every override, prop, hint, widget id, enum color, icon name), see
> [`CONFIGURATION.md`](./CONFIGURATION.md). This page covers the setup mechanics.

There are three distribution models; pick per client:

| Model | When | Per-client repo? |
|---|---|---|
| **A — config only** | Standard backoffice, no custom React | No — one deployment, point env at each backend |
| **B — npm + thin app** | Some custom widgets/pages, own branding | Yes — a tiny Vite app (this guide) |
| **C — scaffold/fork** | Heavily bespoke | Yes — a full copy |

**B is the default.** A client app is usually one `main.tsx` plus two manifest files.

---

## 1. The manifest: auto-generated + your overrides

The backend (`@volcanicminds/backend` ≥ 3.2) **generates the manifest automatically** from
its routes + JSON Schemas — no hand-authoring of the resource map. The client never edits
that generated description; it only adds a thin **overrides** layer for presentation
(labels, groups, widgets, layouts). Two files, two owners:

| File | Owner | Edited by hand? |
|---|---|---|
| `manifest.generated.ts` | the backend | **never** — overwritten on every refresh |
| `manifest.overrides.ts` | the client | yes — your only manifest source-of-truth |

The engine merges them by canonical identity `(resource, field)` / capability name:
`merge(generated, overrides)`. The overrides survive every regeneration, so backend drift
(a new field, a renamed enum) flows in on the next pull without clobbering your UI choices.

### 1.1 Build-time pull (recommended)

Pull the manifest into the repo at build time. It is **pinned, reviewable in a PR, and the
build works offline** — no live backend needed to compile.

```bash
# fetch GET <url>/admin/manifest, validate against the v2 JSON Schema, and write
#   src/manifest.generated.ts  (always — AUTO-GENERATED header; also emits the
#                               `GeneratedFieldMap` type for typed field names)
#   src/manifest.overrides.ts  (scaffolded once, only if absent — yours thereafter;
#                               scaffold is `ManifestOverrides<GeneratedFieldMap>`)
npx volcanic-admin-pull --url https://api.acme.example --out src
# or from a snapshot file instead of a live backend:
npx volcanic-admin-pull --from ./manifest.snapshot.json --out src
```

Add it as a script so refreshing is one command:

```jsonc
// package.json
{ "scripts": { "pull:manifest": "volcanic-admin-pull --url $VITE_API_BASE_URL --out src" } }
```

Wire both files into the app:

```tsx
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { generatedManifest } from './manifest.generated' // pulled — never edit
import { overrides } from './manifest.overrides'         // yours
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <VolcanicAdmin
    apiUrl={import.meta.env.VITE_API_BASE_URL}
    apiBasePath="" // '' = real hand-written routes; '/admin' (default) = generic CRUD
    authMode="bearer"
    manifest={generatedManifest}
    manifestOverrides={overrides}
    dictionaries={dictionaries}
    defaultLocale="it"
    locales={['it']}
  />
)
```

`manifest.overrides.ts` is plain typed data — fill what the schema-only generator can't
infer and trim noise (see §3 for the override surface):

Type it against the pulled `GeneratedFieldMap` (see below) so every field reference is
checked at compile time. Fields carry **data + structure only**; all presentation and
ordering live in the resource's ordered **view blocks** (`list` / `form`).

```ts
import type { ManifestOverrides } from '@volcanicminds/admin'
import type { GeneratedFieldMap } from './manifest.generated'

export const overrides: ManifestOverrides<GeneratedFieldMap> = {
  excludeResources: ['token', 'health'], // keep on the backend, hide from the panel
  groups: [{ name: 'catalog', label: 'group.catalog', icon: 'car', order: 10 }],
  resources: {
    vehicle: {
      titleField: 'name',
      fields: {
        // enrich the thin schema-only relation + point it at the writable FK
        brand: { type: 'relation', relation: { resource: 'brand', titleField: 'name', foreignKey: 'brandId' } }
      },
      // presentation + ordering live in the view blocks (array order = render order;
      // a present array is the authoritative allowlist)
      list: {
        defaultLayout: 'card',
        table: { columns: [{ field: 'name' }, { field: 'brand' }, { field: 'status' }] },
        card: { title: 'name', subtitle: 'brand', badges: ['status'] }
      },
      form: {
        columns: 2,
        groups: [
          { name: 'default', fields: [{ field: 'name' }, { field: 'brandId', widget: 'reference-select' }] }
        ]
      }
    }
  }
}
```

> **Typed field names.** `volcanic-admin-pull` also emits an
> `export type GeneratedFieldMap = { vehicle: 'id' | 'name' | 'brand' | …; … }` in
> `manifest.generated.ts`. Typing the overrides as `ManifestOverrides<GeneratedFieldMap>`
> turns a mistyped `field:` (in columns / form entries / card slots / `sort` / `fields`
> keys) into a **compile error** instead of a silently-skipped entry. The generic defaults
> to `string`, so untyped `ManifestOverrides` keeps working. See
> [`CONFIGURATION.md`](./CONFIGURATION.md) §12.

### 1.2 Runtime fetch (no pull step)

Skip the pull and let the engine fetch `GET ${apiUrl}/admin/manifest` at boot — drop the
`manifest` prop and pass only `apiUrl`. Simplest to wire, but the build depends on a live
backend and the manifest isn't pinned in the repo. Overrides still apply: pass
`manifestOverrides` and they merge onto the fetched manifest.

```tsx
<VolcanicAdmin
  apiUrl={import.meta.env.VITE_API_BASE_URL} // engine fetches /admin/manifest
  manifestOverrides={overrides}              // still merged on top
  dictionaries={dictionaries}
/>
```

> **Model A (no repo):** the runtime-fetch build can serve many clients — deploy once and
> set `VITE_API_BASE_URL` per environment/subdomain.

---

## 2. Simple case (≈ 1 file)

A client that only needs the auto-generated CRUD from its backend manifest, no custom React.

```bash
npm create vite@latest acme-admin -- --template react-ts
cd acme-admin
npm i @volcanicminds/admin \
  react react-dom react-router \
  @refinedev/core @refinedev/react-router @refinedev/react-hook-form react-hook-form
npx volcanic-admin-pull --url https://api.acme.example --out src   # §1.1
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css' // prebuilt theme — no Tailwind needed
import { generatedManifest } from './manifest.generated'
import { overrides } from './manifest.overrides'
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL} // backend exposing /admin/manifest
      authMode="cookie" // or "bearer"
      manifest={generatedManifest}
      manifestOverrides={overrides}
      dictionaries={dictionaries} // your i18n labels for the manifest keys
    />
  </StrictMode>
)
```

`.env`:

```
VITE_API_BASE_URL=https://api.acme.example
```

That's it. The engine builds resources from the manifest and renders list/create/edit/show,
filters, omni-search, pagination, XLS import/export, **row/bulk/collection actions**, auth +
MFA, multi-tenant. `dictionaries` translate the manifest keys (`res.*`, `field.*`, `enum.*`,
`group.*`, `action.*`); missing keys fall back to a humanized label.

> **Need custom React?** Stay on B — add **plugins** (§3) for theme, components, and pages.
> Customization is injected, and shared customizations can be their own npm package reused
> across clients — no fork, no monorepo.

---

## 3. Complex case — plugins (theme, components, pages)

Customization is **injected**, never forked or monkey-patched. The manifest references your
components by **id**; the engine resolves them. You can pass customization inline as props
(`overrides`, `routes`, `theme`, `dictionaries`) — but the clean way to keep `main.tsx` tiny
and customization modular is a **plugin**.

A plugin is a plain object that contributes any of: `widgets`, `views`, `actions`, `routes`,
`dictionaries`, `theme`, `branding`. Plugins **compose** (later wins on key collisions; direct props win
over plugins). Put one plugin per concern in its own file — or publish it as its own npm
package and **share it across client repos** (no fork, no monorepo).

```tsx
// main.tsx stays tiny — concerns live in plugin files
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { generatedManifest } from './manifest.generated'
import { overrides } from './manifest.overrides'
import { themePlugin } from './plugins/theme.plugin'       // §3.3
import { catalogPlugin } from './plugins/catalog.plugin'   // §3.1 + §3.2
import { dashboardPlugin } from './plugins/dashboard.plugin' // §3.4
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <VolcanicAdmin
    apiUrl={import.meta.env.VITE_API_BASE_URL}
    manifest={generatedManifest}
    manifestOverrides={overrides}
    dictionaries={dictionaries}
    plugins={[themePlugin, catalogPlugin, dashboardPlugin]}
  />
)
```

```ts
// plugins/catalog.plugin.tsx
import { defineAdminPlugin } from '@volcanicminds/admin'
import { RatingWidget } from '../widgets/RatingWidget'
import { VehicleShow } from '../views/VehicleShow'

export const catalogPlugin = defineAdminPlugin({
  name: 'catalog',
  widgets: { rating: RatingWidget },
  views: { 'vehicle-show': VehicleShow }
})
```

> The inline props (`overrides`/`routes`/`theme`/`dictionaries`) and plugins are merged, so
> you can mix both. Everything below works either way.

### 3.1 Custom field widget

A widget renders one field. It receives `WidgetProps` (`value`, `onChange`, `field`, `t`,
`disabled`) and is registered under the id referenced from a form view entry
(`resources[name].form.groups[].fields[].widget`).

```tsx
import type { WidgetProps } from '@volcanicminds/admin'

export function RatingWidget({ value, onChange, disabled }: WidgetProps) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" disabled={disabled} onClick={() => onChange(n)}>
          {n <= Number(value ?? 0) ? '★' : '☆'}
        </button>
      ))}
    </div>
  )
}
```

Override (`manifest.overrides.ts`): declare the field's intrinsics in `fields`
(`vehicle.fields.score = { type: 'integer' }`) and reference the widget from the form view
entry — `vehicle.form.groups[0].fields` includes `{ field: 'score', widget: 'rating' }`.
The same `WidgetProps` shape is reused for read-only display if you also register a display
variant.

**Built-in extras** (no custom code needed):
- **`multiselect`** widget — checkbox group for an array field; options come from the field's
  `enum`. Declare the enum on the field (`user.fields.roles = { type: 'enum', enum: [{value:'admin',label:'role.admin'}] }`)
  and pick the widget in the form entry: `{ field: 'roles', widget: 'multiselect' }`.
- **`visibleOn`** — a form-entry prop, `'create' | 'edit'`, restricts a field to one form mode
  (omitted = both). e.g. `{ field: 'password', visibleOn: 'create' }` hides it when editing.

### 3.2 Custom view

A **view** override replaces a whole screen. It receives `{ model: ResourceModel; id?: string }`
(`id` for edit/show). Reuse the engine pieces (`useResourceModel`, Refine hooks) or build
freely.

> **Actions:** manifest capabilities are rendered as row/bulk/collection buttons in the
> generated list/show out of the box (`payload`, `visibleWhen`, `confirm`, CSV download). Add
> `input: { fields: [...] }` to prompt for values in a dialog and send them as the request body
> (e.g. a "Reset password" action posting a typed password). The registry also has an `action`
> slot (`overrides.action`, resolved by `action.component`) to swap in a fully custom button.

```tsx
import { useResourceModel, useT } from '@volcanicminds/admin'
import type { ResourceModel } from '@volcanicminds/admin'

export function VehicleShow({ model, id }: { model: ResourceModel; id?: string }) {
  const t = useT()
  // …custom layout using model.fields / Refine's useOne(id)…
  return <div>{t(model.spec.label.singular)} — custom screen for {id}</div>
}
```

Override: `vehicle.views = { show: 'vehicle-show' }`. Where a view is `'auto'`, the generated
screen is used.

### 3.3 Theming / graphical style

Pass theme tokens as **data** (a `theme` prop or `plugin.theme`) — injected as CSS variables
at runtime, no CSS file or rebuild. Colors are HSL channels.

```ts
// plugins/theme.plugin.ts
import { defineAdminPlugin } from '@volcanicminds/admin'

export const themePlugin = defineAdminPlugin({
  name: 'brand-theme',
  theme: {
    primary: '221 83% 53%',
    primaryForeground: '0 0% 100%',
    ring: '221 83% 53%',
    radius: '0.75rem',
    dark: { primary: '217 91% 60%' }
  }
})
```

(Equivalent inline: `<VolcanicAdmin theme={{ primary: '221 83% 53%', … }} />`.) You can still
override the CSS variables in a stylesheet if you prefer; both work.

**Logo & app name.** The sidebar header shows your brand via the `branding` prop (or
`plugin.branding`): `logo` (image src for the expanded sidebar), `logoCollapsed` (small
mark for the collapsed rail), and `appName` (label + the fallback badge initial). Without
it the engine shows a neutral badge + "Volcanic Admin".

```tsx
<VolcanicAdmin branding={{ appName: 'Acme', logo: '/logo.svg' }} … />
```

If you build your **own** components with Tailwind and want the same tokens/utilities, extend
the shipped preset:

```js
// tailwind.config.js
import volcanicPreset from '@volcanicminds/admin/tailwind-preset'

export default {
  presets: [volcanicPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}']
}
```

### 3.4 Custom pages & dashboards

`routes` mounts arbitrary screens inside the admin shell (sidebar + topbar). Add `nav` to
show a sidebar entry, and `index: true` to make it the landing page (replacing the default
redirect to the first resource). Pages can use any Refine hook against the same data layer:

```tsx
import { useList } from '@refinedev/core'

export function Dashboard() {
  const { data: vehicles } = useList({ resource: 'vehicle', pagination: { pageSize: 1 } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="rounded-xl border p-6">Vehicles: {vehicles?.total ?? '—'}</div>
    </div>
  )
}
```

### 3.5 Share customizations across client repos (no fork, no monorepo)

A plugin is just an object, so extract the customizations that several clients share into
their **own npm package** and install it in each client repo:

```ts
// @acme/admin-plugin-catalog  (its own repo/package)
import { defineAdminPlugin } from '@volcanicminds/admin'
export const catalogPlugin = defineAdminPlugin({ /* widgets, views, theme, … */ })
```

```tsx
// each client app
import { catalogPlugin } from '@acme/admin-plugin-catalog'
<VolcanicAdmin apiUrl={…} plugins={[catalogPlugin]} />
```

Bump the shared package → every client picks it up via `npm update`. Each client keeps its
own thin repo; nothing is forked and there is no shared monorepo.

### 3.6 Auto-load plugins by convention (optional)

To avoid editing `main.tsx` when you add a file, let the build collect plugins from a folder
using Vite's `import.meta.glob`:

```ts
// src/plugins/index.ts
import type { AdminPlugin } from '@volcanicminds/admin'

const mods = import.meta.glob('./*.plugin.{ts,tsx}', { eager: true })
export const plugins: AdminPlugin[] = Object.values(mods).flatMap((m: any) =>
  Object.values(m).filter((x) => x && typeof x === 'object' && ('widgets' in x || 'views' in x || 'routes' in x || 'theme' in x || 'actions' in x))
)
```

```tsx
import { plugins } from './plugins'
<VolcanicAdmin apiUrl={…} plugins={plugins} />
```

Now dropping a new `*.plugin.ts(x)` under `src/plugins/` registers it automatically.

---

## 4. `<VolcanicAdmin>` props (reference)

| Prop | Purpose |
|---|---|
| `apiUrl` | Backend base URL (manifest + CRUD). |
| `apiBasePath` | Base path for CRUD calls. Default `'/admin'` (generic CRUD); set `''` for real hand-written routes. |
| `authMode` | `'cookie'` (default from manifest) or `'bearer'`. |
| `basename` | Router base path when mounted under a sub-path. |
| `manifest` / `loadManifest` | Provide a pulled/static manifest (build-time, §1.1) or a custom loader; default = `GET /admin/manifest` (runtime, §1.2). |
| `manifestOverrides` | Project overrides merged onto the generated/fetched manifest by `(resource, field)` / capability. |
| `dataProvider` / `authClient` | Override the providers (e.g. an in-memory mock for dev). |
| `dictionaries`, `defaultLocale`, `locales` | i18n. |
| `overrides` | Component registry: `{ widget, view, action }` keyed by manifest componentId. |
| `routes` | Custom pages: `{ path, element, index?, nav? }`. |
| `theme` | Theme tokens injected as CSS variables (`{ primary, ring, radius, …, dark }`). |
| `branding` | Sidebar brand: `{ appName, logo, logoCollapsed }`. |
| `plugins` | Composable bundles: `{ widgets, views, actions, routes, dictionaries, theme, branding }` (use `defineAdminPlugin`). |
| `fetchTenants` | Tenant list loader (multi-tenant); default `GET /tenants`. |

> **`manifest` vs `manifestOverrides`.** `manifest` is the generated description (don't edit);
> `manifestOverrides` is your `ManifestOverrides` layer merged on top. `overrides` is a
> *different* prop — the React component registry that backs the `widget` ids used in
> `form` view entries / the `views` ids.

## 5. Dev without a backend

For local development you can drive the admin from a static manifest + an in-memory data
provider (see this repo's `src/mock/*` and the demo `src/App.tsx`). Pass `manifest`,
`dataProvider`, and `authClient` props instead of `apiUrl`.

## 6. Publishing / registry

`@volcanicminds/admin` is a scoped package. Publish to npm (public) or a private registry
(GitHub Packages / private npm org). Peers (`react`, `react-dom`, `react-router`,
`@refinedev/*`, `react-hook-form`) are provided by the client app so there is a single
shared copy — required for Refine's React context to work.
