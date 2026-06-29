# Client starter (simple)

Minimal backoffice on `@volcanicminds/admin`. The backend **auto-generates the manifest**;
you provide only the API URL, your i18n labels, and a thin `manifest.overrides.ts`
(presentation layer — labels, groups, widgets).

```bash
npm install
cp .env.example .env        # set VITE_API_BASE_URL
npm run pull:manifest       # optional: pin the manifest in the repo (build-time pull)
npm run dev
```

Two manifest files, two owners (see [`docs/CONSUMING.md`](../../docs/CONSUMING.md) §1):

- `src/manifest.generated.ts` — pulled from the backend, **never edited**.
- `src/manifest.overrides.ts` — yours, merged on top by `(resource, field)`.

This example runs in **runtime-fetch** mode out of the box (`src/main.tsx` passes only
`apiUrl`, so the engine fetches `/admin/manifest` at boot). Run `pull:manifest` and add
`manifest={generatedManifest}` to switch to the pinned build-time flow.

See [`docs/CONSUMING.md`](../../docs/CONSUMING.md) §3 for the advanced case (custom widgets,
views, dashboards, theming).
