/** Provides the active AuthClient (real or mock) to the component tree. */
import { createContext, useContext, type ReactNode } from 'react'
import type { AuthClient } from './client.js'

const AuthClientContext = createContext<AuthClient | null>(null)

export function AuthClientProvider({
  client,
  children
}: {
  client: AuthClient
  children: ReactNode
}) {
  return <AuthClientContext.Provider value={client}>{children}</AuthClientContext.Provider>
}

export function useAuthClient(): AuthClient {
  const ctx = useContext(AuthClientContext)
  if (!ctx) throw new Error('useAuthClient must be used within an AuthClientProvider')
  return ctx
}
