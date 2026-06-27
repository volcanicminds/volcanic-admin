import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css' // engine theme + base
import './tailwind.css' // utilities for our own components
import './theme.css' // brand color overrides
import { dictionaries } from './i18n'
import { RatingWidget } from './widgets/RatingWidget'
import { VehicleShow } from './views/VehicleShow'
import { Dashboard } from './pages/Dashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL}
      dictionaries={dictionaries}
      overrides={{
        widget: { rating: RatingWidget }, // manifest field.form.widget === "rating"
        view: { 'vehicle-show': VehicleShow } // manifest views.show === "vehicle-show"
      }}
      routes={[
        {
          path: '/dashboard',
          element: <Dashboard />,
          index: true, // landing page instead of the first resource
          nav: { label: 'nav.dashboard', icon: 'layers', order: 0 }
        }
      ]}
    />
  </StrictMode>
)
