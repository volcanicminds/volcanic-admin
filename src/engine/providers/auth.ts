/**
 * Volcanic auth provider: drives the login flow of the backend through an AuthClient.
 * The login action is one request of the flow:
 *   - { flow: 'start', method, ...input }            runs an identifier (`password`, `email-otp`, `oidc`)
 *   - { flow: 'step', method, action?, ...input }    answers the stage owed next
 * A request that ends in the session resolves with a redirect; one that ends in another stage
 * resolves with success:true, no redirect and `pending`, so the LoginView can render that stage.
 */
import type { AuthProvider } from '@refinedev/core'
import type { AuthMode } from './data.js'
import type { AuthClient, AuthData, FlowAnswer } from '../auth/client.js'
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
    if (!data?.token) {
      // A successful login that carries no token is a cookie deployment saying so. Anything left
      // in the store belongs to an earlier configuration and must not outlive this answer, or the
      // next boot would read it as evidence of a bearer deployment that no longer exists.
      tokenStore.clear()
      return
    }
    if (authMode !== 'bearer') onBearerDetected?.()
    tokenStore.set(data.token)
    if (data.refreshToken) tokenStore.setRefresh(data.refreshToken)
  }

  return {
    login: async (params: any) => {
      try {
        const { flow, method, action, redirectTo = '/', ...input } = params ?? {}
        const answer: FlowAnswer =
          flow === 'step' ? await client.flowStep(method, input, action) : await client.flowStart(method, input)
        if (answer.pending) return { success: true, pending: answer.pending }
        storeAuth(answer.session)
        return { success: true, redirectTo }
      } catch (e: any) {
        // The backend answers every pre-verification failure with one code
        // (`AUTH_INVALID_CREDENTIALS`), on purpose: distinct messages told anyone who asked
        // whether an address had an account here. The code is carried through because a login
        // screen acts on it: `PASSWORD_TO_BE_CHANGED`, which arrives only after the password
        // verified, offers the reset; a code that ends the flow goes back to the first step; and
        // `remaining` and `retryAt` say how many attempts are left and when a send may be asked.
        return {
          success: false,
          error: {
            name: 'LoginError',
            message: e?.message ?? 'Login failed',
            statusCode: e?.statusCode ?? e?.status,
            code: e?.code,
            remaining: e?.remaining,
            retryAt: e?.retryAt
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
