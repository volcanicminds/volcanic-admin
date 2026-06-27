/**
 * Demo / development app — exercises the public <VolcanicAdmin> API.
 * Default: in-memory mock (no backend). Set VITE_ADMIN_SOURCE=rest to point at
 * a real Volcanic backend via VITE_API_BASE_URL.
 */
import { VolcanicAdmin } from './VolcanicAdmin'
import { mockManifest } from './mock/manifest'
import { mockDataProvider } from './mock/mockDataProvider'
import { mockAuthClient } from './mock/mockAuthClient'
import { mockDictionaries } from './mock/i18n'
import { mockTenants } from './mock/data'

const SOURCE = import.meta.env.VITE_ADMIN_SOURCE ?? 'mock'
const IS_MOCK = SOURCE !== 'rest'
const API_URL = import.meta.env.VITE_API_BASE_URL

export default function App() {
  if (IS_MOCK) {
    return (
      <VolcanicAdmin
        manifest={mockManifest}
        dataProvider={mockDataProvider}
        authClient={mockAuthClient}
        dictionaries={mockDictionaries}
        fetchTenants={async () => mockTenants}
      />
    )
  }
  return <VolcanicAdmin apiUrl={API_URL} dictionaries={mockDictionaries} />
}
