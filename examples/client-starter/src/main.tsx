import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { VolcanicAdmin } from '@volcanicminds/admin'
import '@volcanicminds/admin/styles.css'
import { dictionaries } from './i18n'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <VolcanicAdmin
      apiUrl={import.meta.env.VITE_API_BASE_URL}
      authMode="cookie"
      dictionaries={dictionaries}
    />
  </StrictMode>
)
