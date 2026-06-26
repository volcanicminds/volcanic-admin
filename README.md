# @volcanicminds/admin

> Manifest-driven backoffice engine for the Volcanic Minds ecosystem.
> Built on [Refine](https://refine.dev) (headless) + [shadcn/ui](https://ui.shadcn.com),
> pointed at a [`@volcanicminds/backend`](https://github.com/volcanicminds/volcanic-backend)
> admin capability that emits a manifest at runtime.

The admin is **auto-generated** from a manifest (`GET /admin/manifest`) yet
**customizable** via targeted overrides. It is single- and multi-tenant ready.
See `VOLCANIC_ADMIN_BLUEPRINT.md` for the full design.

## Architecture (internal split)

```
src/
  engine/   headless, UI-agnostic — never imports ui/
    types/manifest.ts     manifest spec v1 (the contract)
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
  mock/     in-memory backend (Dionisi-flavored) for dev without a server
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

1. **Manifest tweak** — field order, labels, visibility, filter operators, form groups. No React.
2. **Widget override** — register a component for a field via `field.form.widget` (override registry).
3. **Action override** — row/bulk/collection buttons hitting dedicated endpoints.
4. **View/page override** — replace a whole screen via `views.{list,create,edit,show}`.

Register overrides on the `OverrideRegistry` passed to `RegistryProvider`.

## Scripts

```bash
npm run dev          # Vite dev server (mock by default)
npm run build        # tsc -b + vite build
npm run type-check   # tsc --noEmit
npm run lint         # eslint
```
