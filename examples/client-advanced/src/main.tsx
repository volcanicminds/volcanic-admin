import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css' // engine theme + base
import './tailwind.css' // utilities for our own components
import { dictionaries } from './i18n'
import { themePlugin } from './plugins/theme.plugin'
import { catalogPlugin } from './plugins/catalog.plugin'
import { dashboardPlugin } from './plugins/dashboard.plugin'

// Customization is modular: each plugin owns one concern (theme, catalog widgets/
// views, dashboard). Plugins compose — and can be published as their own npm
// package and shared across client repos (no fork, no monorepo).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL}
      dictionaries={dictionaries}
      plugins={[themePlugin, catalogPlugin, dashboardPlugin]}
    />
  </StrictMode>
)
