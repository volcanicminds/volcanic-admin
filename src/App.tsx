/**
 * Demo / development app — exercises the public <VolcanicAdmin> API.
 * Default: in-memory mock (no backend). Set VITE_ADMIN_SOURCE=rest to point at
 * a real Volcanic backend via VITE_API_BASE_URL; VITE_ADMIN_PLANE=control opens the
 * platform console instead of a customer's, and VITE_ADMIN_TENANT fixes the tenant.
 */
import { VolcanicAdmin } from './VolcanicAdmin'
import { mockManifest } from './mock/manifest'
import { mockControlManifest } from './mock/controlManifest'
import { mockOverrides } from './mock/overrides'
import { mockDataProvider } from './mock/mockDataProvider'
import { mockAuthClient, mockControlAuthClient } from './mock/mockAuthClient'
import { mockDictionaries } from './mock/i18n'
import { mockTenants } from './mock/data'

const SOURCE = import.meta.env.VITE_ADMIN_SOURCE ?? 'mock'
const IS_MOCK = SOURCE !== 'rest'
const API_URL = import.meta.env.VITE_API_BASE_URL
const PLANE = import.meta.env.VITE_ADMIN_PLANE === 'control' ? 'control' : 'tenant'
const TENANT = import.meta.env.VITE_ADMIN_TENANT || undefined

export default function App() {
  if (IS_MOCK) {
    // The platform console and a customer's are the same component on two planes. What changes is
    // the manifest, the catalogue the session's roles come from, and the absence of a tenant to
    // switch: on the control plane there is no tenant to be inside of.
    if (PLANE === 'control') {
      return (
        <VolcanicAdmin
          plane="control"
          manifest={mockControlManifest}
          dataProvider={mockDataProvider}
          authClient={mockControlAuthClient}
          dictionaries={mockDictionaries}
        />
      )
    }
    return (
      <VolcanicAdmin
        manifest={mockManifest}
        manifestOverrides={mockOverrides}
        dataProvider={mockDataProvider}
        authClient={mockAuthClient}
        dictionaries={mockDictionaries}
        fetchTenants={async () => mockTenants}
      />
    )
  }
  return <VolcanicAdmin apiUrl={API_URL} plane={PLANE} tenant={TENANT} dictionaries={mockDictionaries} />
}
