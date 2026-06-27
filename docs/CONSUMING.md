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
> set `VITE_API_BASE_URL` per environment/subdomain. Use B only when a client needs
> custom React.

---

## 2. Complex case — overrides, custom components, dashboards, theming

Everything custom is passed as props to `<VolcanicAdmin>`. Nothing is monkey-patched;
the manifest references your components by **id** and the engine resolves them.

```tsx
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import './theme.css'                 // §2.3 brand colors
import { dictionaries } from './i18n'
import { RatingWidget } from './widgets/RatingWidget'      // §2.1
import { VehicleShow } from './views/VehicleShow'          // §2.2
import { Dashboard } from './pages/Dashboard'              // §2.4

createRoot(document.getElementById('root')!).render(
  <VolcanicAdmin
    apiUrl={import.meta.env.VITE_API_BASE_URL}
    dictionaries={dictionaries}
    overrides={{
      widget: { rating: RatingWidget },            // field.form.widget === "rating"
      view: { 'vehicle-show': VehicleShow }         // views.show === "vehicle-show"
    }}
    routes={[
      // a custom landing dashboard + extra pages
      { path: '/dashboard', element: <Dashboard />, index: true,
        nav: { label: 'nav.dashboard', icon: 'layers', order: 0 } }
    ]}
  />
)
```

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

The theme is driven by CSS variables (shadcn tokens). Override them **after** importing the
stylesheet — no rebuild required:

```css
/* theme.css */
:root {
  --primary: 221 83% 53%;        /* brand color (HSL channels) */
  --primary-foreground: 0 0% 100%;
  --ring: 221 83% 53%;
  --radius: 0.75rem;
}
.dark {
  --primary: 217 91% 60%;
}
```

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
