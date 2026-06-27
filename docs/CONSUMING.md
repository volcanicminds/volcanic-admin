# Consuming `@volcanicminds/admin`

How to build a client backoffice on top of the manifest-driven engine.

There are three distribution models; pick per client:

| Model | When | Per-client repo? |
|---|---|---|
| **A — config only** | Standard backoffice, no custom React | No — one deployment, point env at each backend |
| **B — npm + thin app** | Some custom widgets/pages, own branding | Yes — a tiny Vite app (this guide) |
| **C — scaffold/fork** | Heavily bespoke | Yes — a full copy |

**B is the default.** A client app is usually one `main.tsx`.

---

## 1. Simple case (≈ 1 file)

A client that only needs the auto-generated CRUD from its backend manifest.

```bash
npm create vite@latest acme-admin -- --template react-ts
cd acme-admin
npm i @volcanicminds/admin \
  react react-dom react-router \
  @refinedev/core @refinedev/react-router @refinedev/react-hook-form react-hook-form
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css' // prebuilt theme — no Tailwind needed
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL} // backend exposing /admin/manifest
      authMode="cookie" // or "bearer"
      dictionaries={dictionaries} // your i18n labels for the manifest keys
    />
  </StrictMode>
)
```

`.env`:

```
VITE_API_BASE_URL=https://api.acme.example
```

That's it. The engine fetches `GET /admin/manifest`, builds resources, and renders
list/create/edit/show, filters, omni-search, pagination, XLS import/export, auth + MFA,
multi-tenant — all from the manifest. `dictionaries` translate the manifest keys
(`res.*`, `field.*`, `enum.*`, `group.*`, `action.*`); missing keys fall back to a
humanized label.

> **Model A (no repo):** the very same build can serve many clients — deploy once and
> set `VITE_API_BASE_URL` per environment/subdomain.
>
> **Need custom React?** Stay on B — add **plugins** (§2) for theme, components, and
> pages. Customization is injected, and shared customizations can be their own npm
> package reused across clients — no fork, no monorepo.

---

## 2. Complex case — plugins (theme, components, pages)

Customization is **injected**, never forked or monkey-patched. The manifest references
your components by **id**; the engine resolves them. You can pass customization inline as
props (`overrides`, `routes`, `theme`, `dictionaries`) — but the clean way to keep
`main.tsx` tiny and customization modular is a **plugin**.

A plugin is a plain object that contributes any of: `widgets`, `views`, `actions`,
`routes`, `dictionaries`, `theme`. Plugins **compose** (later wins on key collisions;
direct props win over plugins). Put one plugin per concern in its own file — or publish it
as its own npm package and **share it across client repos** (no fork, no monorepo).

```tsx
// main.tsx stays tiny — concerns live in plugin files
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { themePlugin } from './plugins/theme.plugin'       // §2.3
import { catalogPlugin } from './plugins/catalog.plugin'   // §2.1 + §2.2
import { dashboardPlugin } from './plugins/dashboard.plugin' // §2.4
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <VolcanicAdmin
    apiUrl={import.meta.env.VITE_API_BASE_URL}
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

> The inline props (`overrides`/`routes`/`theme`/`dictionaries`) and plugins are merged,
> so you can mix both. Everything below works either way.

### 2.1 Custom field widget

A widget renders one field. It receives `WidgetProps` (`value`, `onChange`, `field`, `t`,
`disabled`) and is registered under the id used in the manifest (`field.form.widget`).

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

Manifest (server or `defineAdminResource`): `{ "name": "score", "type": "integer",
"form": { "widget": "rating" } }`. The same `WidgetProps` shape is reused for read-only
display if you also register a display variant.

### 2.2 Custom view

A **view** override replaces a whole screen. It receives `{ model: ResourceModel; id?: string }`
(`id` for edit/show). Reuse the engine pieces (`useResourceModel`, Refine hooks) or build
freely.

> **Actions:** the registry also has an `action` slot (`overrides.action`, resolved by
> `action.component`) for custom row/bulk/collection buttons. Rendering of manifest
> `actions` in the generated list/show is on the roadmap; the slot is already in place.

```tsx
import { useResourceModel, useT } from '@volcanicminds/admin'
import type { ResourceModel } from '@volcanicminds/admin'

export function VehicleShow({ model, id }: { model: ResourceModel; id?: string }) {
  const t = useT()
  // …custom layout using model.fields / Refine's useOne(id)…
  return <div>{t(model.spec.label.singular)} — custom screen for {id}</div>
}
```

Manifest: `"views": { "show": "vehicle-show" }`. Where a view is `"auto"`, the generated
screen is used.

### 2.3 Theming / graphical style

Pass theme tokens as **data** (a `theme` prop or `plugin.theme`) — injected as CSS
variables at runtime, no CSS file or rebuild. Colors are HSL channels.

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

(Equivalent inline: `<VolcanicAdmin theme={{ primary: '221 83% 53%', … }} />`.) You can
still override the CSS variables in a stylesheet if you prefer; both work.

If you build your **own** components with Tailwind and want the same tokens/utilities,
extend the shipped preset:

```js
// tailwind.config.js
import volcanicPreset from '@volcanicminds/admin/tailwind-preset'

export default {
  presets: [volcanicPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}']
}
```

### 2.4 Custom pages & dashboards

`routes` mounts arbitrary screens inside the admin shell (sidebar + topbar). Add `nav`
to show a sidebar entry, and `index: true` to make it the landing page (replacing the
default redirect to the first resource). Pages can use any Refine hook against the same
data layer:

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

### 2.5 Share customizations across client repos (no fork, no monorepo)

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

### 2.6 Auto-load plugins by convention (optional)

To avoid editing `main.tsx` when you add a file, let the build collect plugins from a
folder using Vite's `import.meta.glob`:

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

## 3. `<VolcanicAdmin>` props (reference)

| Prop | Purpose |
|---|---|
| `apiUrl` | Backend base URL (manifest + CRUD). |
| `authMode` | `'cookie'` (default from manifest) or `'bearer'`. |
| `basename` | Router base path when mounted under a sub-path. |
| `manifest` / `loadManifest` | Provide a static manifest or a custom loader (default: `GET /admin/manifest`). |
| `dataProvider` / `authClient` | Override the providers (e.g. an in-memory mock for dev). |
| `dictionaries`, `defaultLocale`, `locales` | i18n. |
| `overrides` | `{ widget, view, action }` keyed by manifest componentId. |
| `routes` | Custom pages: `{ path, element, index?, nav? }`. |
| `theme` | Theme tokens injected as CSS variables (`{ primary, ring, radius, …, dark }`). |
| `plugins` | Composable bundles: `{ widgets, views, actions, routes, dictionaries, theme }` (use `defineAdminPlugin`). |
| `fetchTenants` | Tenant list loader (multi-tenant); default `GET /tenants`. |

## 4. Dev without a backend

For local development you can drive the admin from a static manifest + an in-memory data
provider (see this repo's `src/mock/*` and the demo `src/App.tsx`). Pass `manifest`,
`dataProvider`, and `authClient` props instead of `apiUrl`.

## 5. Publishing / registry

`@volcanicminds/admin` is a scoped package. Publish to npm (public) or a private registry
(GitHub Packages / private npm org). Peers (`react`, `react-dom`, `react-router`,
`@refinedev/*`, `react-hook-form`) are provided by the client app so there is a single
shared copy — required for Refine's React context to work.
