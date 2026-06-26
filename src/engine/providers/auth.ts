/**
 * Volcanic auth provider — drives the native /auth flow through an AuthClient.
 * The login action is multi-step to support MFA:
 *   - { email, password }            → credentials; may return mfaRequired/mfaSetupRequired
 *   - { mfaStep: 'verify', code }     → TOTP verify with the stored temp token
 *   - { mfaStep: 'enable', secret, code } → enable MFA during a forced-setup login
 * On the MFA-pending branch login resolves with success:true (no redirect) and
 * the flags, so the LoginView can render the next step.
 */
import type { AuthProvider } from '@refinedev/core'
import type { AuthMode } from './data.js'
import type { AuthClient, AuthData } from '../auth/client.js'
import { tokenStore } from '../auth/tokenStore.js'

export interface VolcanicAuthOptions {
  client: AuthClient
  authMode?: AuthMode
}

export function createVolcanicAuthProvider({
  client,
  authMode = 'cookie'
}: VolcanicAuthOptions): AuthProvider {
  const storeAuth = (data: AuthData) => {
    if (data?.token) tokenStore.set(data.token)
    if (data?.refreshToken) tokenStore.setRefresh(data.refreshToken)
  }

  return {
    login: async (params: any) => {
      try {
        if (params?.mfaStep === 'verify') {
          const data = await client.verifyMfa(params.code, tokenStore.getTempMfa())
          storeAuth(data)
          tokenStore.setTempMfa(undefined)
          return { success: true, redirectTo: '/' }
        }
        if (params?.mfaStep === 'enable') {
          const data = await client.enableMfa(params.secret, params.code, tokenStore.getTempMfa())
          storeAuth(data)
          tokenStore.setTempMfa(undefined)
          return { success: true, redirectTo: '/' }
        }

        const res = await client.login(params.email ?? params.username, params.password)
        if (res?.mfaRequired || res?.mfaSetupRequired) {
          tokenStore.setTempMfa(res.tempToken)
          return {
            success: true,
            mfaRequired: Boolean(res.mfaRequired),
            mfaSetupRequired: Boolean(res.mfaSetupRequired)
          }
        }
        storeAuth(res)
        return { success: true, redirectTo: '/' }
      } catch (e: any) {
        return { success: false, error: { name: 'LoginError', message: e?.message ?? 'Login failed' } }
      }
    },

    logout: async () => {
      await client.logout()
      tokenStore.clear()
      return { success: true, redirectTo: '/login' }
    },

    check: async () => {
      if (authMode === 'bearer') {
        return tokenStore.get()
          ? { authenticated: true }
          : { authenticated: false, redirectTo: '/login', logout: true }
      }
      // COOKIE mode: verify via /users/me.
      try {
        await client.me()
        return { authenticated: true }
      } catch {
        return { authenticated: false, redirectTo: '/login', logout: true }
      }
    },

    getIdentity: async () => {
      try {
        return await client.me()
      } catch {
        return null
      }
    },

    getPermissions: async () => {
      try {
        const me = await client.me()
        return me?.roles ?? []
      } catch {
        return []
      }
    },

    updatePassword: async (params: any) => {
      try {
        const me = await client.me()
        await client.changePassword(
          me?.email,
          params.oldPassword,
          params.password,
          params.confirmPassword ?? params.password
        )
        return { success: true }
      } catch (e: any) {
        return {
          success: false,
          error: { name: 'UpdatePasswordError', message: e?.message ?? 'Change failed' }
        }
      }
    },

    forgotPassword: async (params: any) => {
      try {
        await client.forgotPassword(params.email)
        return { success: true }
      } catch (e: any) {
        return {
          success: false,
          error: { name: 'ForgotPasswordError', message: e?.message ?? 'Request failed' }
        }
      }
    },

    onError: async (error) => {
      if (error?.statusCode === 401 || error?.status === 401) {
        return { logout: true, redirectTo: '/login', error }
      }
      return {}
    }
  }
}
