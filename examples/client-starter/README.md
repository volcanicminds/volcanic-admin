# Client starter (simple)

Minimal backoffice on `@volcanicminds/admin`. Auto-generates everything from the
backend manifest — you only provide the API URL and i18n labels.

```bash
npm install
cp .env.example .env   # set VITE_API_BASE_URL
npm run dev
```

The whole app is `src/main.tsx` (+ `src/i18n.ts`). See
[`docs/CONSUMING.md`](../../docs/CONSUMING.md) for the advanced case (custom widgets,
views, dashboards, theming).
