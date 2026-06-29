import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css' // engine theme + base
import './tailwind.css' // utilities for our own components
import { overrides } from './manifest.overrides'
import { dictionaries } from './i18n'
import { themePlugin } from './plugins/theme.plugin'
import { catalogPlugin } from './plugins/catalog.plugin'
import { dashboardPlugin } from './plugins/dashboard.plugin'

// The backend auto-generates the manifest; `manifest.overrides.ts` is the client-owned
// presentation layer. Customization is modular: each plugin owns one concern (theme,
// catalog widgets/views, dashboard) and can be published as its own npm package and shared
// across client repos (no fork, no monorepo). Run `npm run pull:manifest` to pin the
// generated manifest and add `manifest={generatedManifest}` (build-time pull, CONSUMING §1.1).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL}
      manifestOverrides={overrides}
      dictionaries={dictionaries}
      plugins={[themePlugin, catalogPlugin, dashboardPlugin]}
    />
  </StrictMode>
)
