# Client advanced (plugins: overrides, dashboard, theming)

Customization is **modular via plugins** — `main.tsx` stays tiny, each concern lives in its
own file (and could be published as an npm package shared across clients, no fork).

- `src/plugins/theme.plugin.ts` — brand theme as data (CSS variables, no CSS file).
- `src/plugins/catalog.plugin.tsx` — custom widget (`rating`) + custom view (`vehicle-show`).
- `src/plugins/dashboard.plugin.tsx` — landing dashboard page + sidebar entry + labels.
- Building blocks: `src/widgets/RatingWidget.tsx`, `src/views/VehicleShow.tsx`,
  `src/pages/Dashboard.tsx`. Tailwind preset for own components in `tailwind.config.js`.

```bash
npm install
cp .env.example .env
npm run dev
```

`src/main.tsx` just composes the plugins:

```tsx
<VolcanicAdmin apiUrl={…} dictionaries={dictionaries}
  plugins={[themePlugin, catalogPlugin, dashboardPlugin]} />
```

See [`docs/CONSUMING.md`](../../docs/CONSUMING.md) §2 for the full plugin reference
(sharing across clients, auto-load by convention, theme tokens).
