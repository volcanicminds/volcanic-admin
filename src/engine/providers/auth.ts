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
  /**
   * Called when a login answered with a token although this console believed it was in cookie
   * mode. Before a manifest the mode is a guess (T-10.12), and the server's own answer is the
   * evidence that settles it.
   */
  onBearerDetected?: () => void
}

export function createVolcanicAuthProvider({
  client,
  authMode = 'cookie',
  onBearerDetected
}: VolcanicAuthOptions): AuthProvider {
  // Leftovers of an earlier bearer configuration go, because a token in the page is exactly what
  // cookie mode exists to avoid (T-10.37).
  if (authMode === 'cookie') tokenStore.clear()

  /**
   * Keeps the session the server actually handed over.
   *
   * The decision is made on the ANSWER, not on the configured mode. A token in the body is only
   * ever sent by a bearer deployment: in cookie mode the backend answers `null` in its place, so
   * this cannot put a cookie session where a script can read it.
   *
   * Reading the configured mode instead is what broke a live control console (found by running
   * it, T-10.20): before a manifest the mode is a guess, `/system/manifest` needs the session it
   * does not have yet, and the guess is `cookie`. The login succeeded, the token it returned was
   * dropped on the floor, the next request went out anonymous, and the operator landed back on
   * the login screen with no error to read.
   */
  const storeAuth = (data: AuthData) => {
    if (!data?.token) return
    if (authMode !== 'bearer') onBearerDetected?.()
    tokenStore.set(data.token)
    if (data.refreshToken) tokenStore.setRefresh(data.refreshToken)
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
        // The backend answers every pre-verification failure with one code
        // (`AUTH_INVALID_CREDENTIALS`), on purpose: distinct messages told anyone who asked
        // whether an address had an account here. The one code worth acting on is
        // `PASSWORD_TO_BE_CHANGED`, which arrives only after the password verified, so it is
        // carried through for a login screen that wants to offer the reset directly.
        return {
          success: false,
          error: {
            name: 'LoginError',
            message: e?.message ?? 'Login failed',
            statusCode: e?.statusCode ?? e?.status,
            code: e?.code
          }
        }
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
      // Reached after the data provider's own renewal attempt failed (T-10.39): a 401 here is
      // a session that is really over.
      if (error?.statusCode === 401 || error?.status === 401) {
        return { logout: true, redirectTo: '/login', error }
      }
      return {}
    }
  }
}
