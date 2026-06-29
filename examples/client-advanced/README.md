# Client advanced (plugins: overrides, dashboard, theming)

Customization is **modular via plugins** — `main.tsx` stays tiny, each concern lives in its
own file (and could be published as an npm package shared across clients, no fork).

- `src/manifest.overrides.ts` — manifest-level overrides (groups, layouts, widget ids,
  relations) merged onto the pulled `manifest.generated.ts`.
- `src/plugins/theme.plugin.ts` — brand theme as data (CSS variables, no CSS file).
- `src/plugins/catalog.plugin.tsx` — custom widget (`rating`) + custom view (`vehicle-show`).
- `src/plugins/dashboard.plugin.tsx` — landing dashboard page + sidebar entry + labels.
- Building blocks: `src/widgets/RatingWidget.tsx`, `src/views/VehicleShow.tsx`,
  `src/pages/Dashboard.tsx`. Tailwind preset for own components in `tailwind.config.js`.

```bash
npm install
cp .env.example .env
npm run pull:manifest       # optional: pin the manifest in the repo (build-time pull)
npm run dev
```

`src/main.tsx` just wires the overrides + plugins:

```tsx
<VolcanicAdmin apiUrl={…} dictionaries={dictionaries}
  manifestOverrides={overrides}
  plugins={[themePlugin, catalogPlugin, dashboardPlugin]} />
```

The `manifest.overrides.ts` (data) and the plugins (React) are complementary: the overrides
name a `form.widget: 'rating'` and a `views.show: 'vehicle-show'`, the catalog plugin
*registers* those ids. See [`docs/CONSUMING.md`](../../docs/CONSUMING.md) §1 (generated +
overrides) and §3 (the full plugin reference: sharing across clients, auto-load by
convention, theme tokens).
