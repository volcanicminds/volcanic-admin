# Client advanced (overrides, dashboard, theming)

Shows the customization surface of `@volcanicminds/admin`:

- **Custom widget** (`src/widgets/RatingWidget.tsx`) → registered as `rating`.
- **Custom view** (`src/views/VehicleShow.tsx`) → registered as `vehicle-show`.
- **Custom page / dashboard** (`src/pages/Dashboard.tsx`) → mounted as the landing route.
- **Theming** (`src/theme.css`) → override CSS variables; Tailwind preset for own components
  (`tailwind.config.js`, `src/tailwind.css`).

```bash
npm install
cp .env.example .env
npm run dev
```

All customization is passed as props to `<VolcanicAdmin>` in `src/main.tsx` — nothing is
monkey-patched. See [`docs/CONSUMING.md`](../../docs/CONSUMING.md) for the full reference.
