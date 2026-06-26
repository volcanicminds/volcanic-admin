/** Always-authenticated auth provider for development (single admin user). */
import type { AuthProvider } from '@refinedev/core'

const IDENTITY = {
  id: 'u1',
  firstName: 'Admin',
  lastName: 'Dionisi',
  email: 'admin@dionisi-to.it',
  username: 'admin',
  roles: ['admin']
}

export const mockAuthProvider: AuthProvider = {
  login: async () => ({ success: true, redirectTo: '/' }),
  logout: async () => ({ success: true, redirectTo: '/login' }),
  check: async () => ({ authenticated: true }),
  getIdentity: async () => IDENTITY,
  getPermissions: async () => IDENTITY.roles,
  onError: async () => ({})
}
