import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { overrides } from './manifest.overrides'
import { dictionaries } from './i18n'

// Runtime-fetch mode: the engine fetches GET ${apiUrl}/admin/manifest at boot and merges
// your overrides on top. To pin the manifest in the repo instead, run `npm run pull:manifest`
// and pass `manifest={generatedManifest}` (build-time pull — see docs/CONSUMING.md §1.1).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL} // backend exposing /admin/manifest
      authMode="cookie" // or "bearer"
      manifestOverrides={overrides} // your client-owned presentation layer
      dictionaries={dictionaries} // i18n labels for the manifest keys
    />
  </StrictMode>
)
