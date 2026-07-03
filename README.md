# @volcanicminds/admin

> Manifest-driven backoffice engine for the Volcanic Minds ecosystem.
> Built on [Refine](https://refine.dev) (headless) + [shadcn/ui](https://ui.shadcn.com),
> pointed at a [`@volcanicminds/backend`](https://github.com/volcanicminds/volcanic-backend)
> admin capability that emits a manifest at runtime.

The admin is **auto-generated** from a manifest (`GET /admin/manifest`) yet
**customizable** via targeted overrides. It is single- and multi-tenant ready.
See `MANIFEST_DESIGN.md` for the full design (manifest v2 contract + engine architecture).

## Use it in a client project

`@volcanicminds/admin` is consumed as a library. A client backoffice is usually one file:

```bash
npm i @volcanicminds/admin \
  react react-dom react-router \
  @refinedev/core @refinedev/react-router @refinedev/react-hook-form react-hook-form
```

```tsx
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <VolcanicAdmin
    apiUrl={import.meta.env.VITE_API_BASE_URL} // backend with /admin/manifest
    authMode="cookie"
    dictionaries={dictionaries}
  />
)
```

The engine builds list/create/edit/show, filters, search, pagination, XLS import/export,
auth + MFA and multi-tenant from the manifest. Customize via `<VolcanicAdmin>` props
(`overrides` for widgets/views, `routes` for dashboards/custom pages, CSS variables for
theming).

- **Full guide:** [`docs/CONSUMING.md`](docs/CONSUMING.md) (simple + complex cases).
- **Config reference:** [`docs/CONFIGURATION.md`](docs/CONFIGURATION.md) (exhaustive map of every override/prop/hint).
- **Starters:** [`examples/client-starter`](examples/client-starter) (simple),
  [`examples/client-advanced`](examples/client-advanced) (overrides, dashboard, theming).

## Architecture (internal split)

```
src/
  engine/   headless, UI-agnostic — never imports ui/
    types/manifest.ts     manifest spec v2 (the contract)
    types/model.ts        interpreted resource model
    interpreter.ts        manifest → model + Refine resources
    magic-query.ts        Refine filters/sorters → Magic Query + v-* headers
    providers/            data · auth · accessControl · tenant
    registry.tsx          override registry (componentId → component)
    i18n.tsx              label-key resolution
    manifest.tsx          fetch + interpret + model context
  ui/       shadcn implementation — consumes engine, swappable
    components/ui/         shadcn primitives
    widgets/              input/display widgets per field type
    generators/          list · create · edit · show · singleton · routes
    layout/              sidebar (grouped) · tenant switcher · shell
    views/               login
  mock/     in-memory backend (brand-neutral Acme Corp sample) for dev without a server
  App.tsx   wiring (engine providers + Refine + router)
```

The **engine** builds the resource model and exposes Refine hooks; the **ui**
renders it. The engine has no shadcn dependency, so the ui is replaceable.

## Develop

```bash
nvm use            # Node >= 24
npm install
npm run dev        # http://localhost:5273  (mock data, no backend needed)
```

`.env` (copy from `.env.example`):

```
VITE_API_BASE_URL=http://0.0.0.0:2230
VITE_ADMIN_SOURCE=mock   # "mock" (in-memory) | "rest" (real backend)
```

In `rest` mode the app fetches `GET /admin/manifest` and talks to the generic
CRUD under `/admin/<path>` using Magic Query and the `v-*` pagination headers.

## Customization (4 override levels)

1. **Manifest tweak** — field order, labels, visibility, filter operators, form groups, table columns & card slots, all via the ordered `list`/`form` view blocks in the overrides. No React.
2. **Widget override** — register a component and reference it by id in a form entry's `widget` (`form.groups[].fields[].widget`, via the override registry).
3. **Action override** — row/bulk/collection buttons hitting dedicated endpoints.
4. **View/page override** — replace a whole screen via `views.{list,create,edit,show}`.

Register overrides on the `OverrideRegistry` passed to `RegistryProvider`.

## Scripts

```bash
npm run dev          # demo/dev app (mock by default → dist-demo)
npm run build        # build the publishable library → dist (JS + style.css + d.ts)
npm run build:demo   # build the demo app → dist-demo
npm run type-check   # tsc --noEmit
npm run lint         # eslint
```

The repo is both the **library** (`src/engine`, `src/ui`, `src/VolcanicAdmin.tsx`,
published via `dist`) and a **demo app** (`src/App.tsx` + `src/mock`) used to develop it.
