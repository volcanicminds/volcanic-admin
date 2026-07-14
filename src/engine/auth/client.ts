/**
 * Auth API client — typed wrapper over the native @volcanicminds/backend auth
 * endpoints. Implemented for the real backend here; the mock provides the same
 * interface. Shapes mirror the framework contract (login may return a `202`-like
 * body with `mfaRequired`/`mfaSetupRequired` + `tempToken`).
 */
import type { AuthMode } from '../providers/data.js'
import { tokenStore } from './tokenStore.js'

export interface AuthData {
  token?: string
  refreshToken?: string
  [key: string]: unknown
}

export interface LoginResponse extends AuthData {
  mfaRequired?: boolean
  mfaSetupRequired?: boolean
  tempToken?: string
}

export interface MfaSetup {
  /** Data-URL of the QR code image. */
  qrCode: string
  /** otpauth:// URI. */
  uri: string
  /** Base32 shared secret (manual entry). */
  secret: string
}

export interface AuthClient {
  login(email: string, password: string): Promise<LoginResponse>
  verifyMfa(code: string, tempToken?: string): Promise<AuthData>
  setupMfa(tempToken?: string): Promise<MfaSetup>
  enableMfa(secret: string, code: string, tempToken?: string): Promise<AuthData>
  disableMfa(): Promise<unknown>
  changePassword(
    email: string,
    oldPassword: string,
    newPassword1: string,
    newPassword2: string
  ): Promise<unknown>
  forgotPassword(email: string): Promise<unknown>
  /** `code` is the reset token from the email link; the backend re-checks that the two passwords match. */
  resetPassword(code: string, newPassword1: string, newPassword2: string): Promise<unknown>
  me(): Promise<any>
  logout(): Promise<unknown>
}

export interface VolcanicAuthClientOptions {
  apiUrl: string
  authMode?: AuthMode
  endpoints?: Partial<Record<string, string>>
}

export function createVolcanicAuthClient(opts: VolcanicAuthClientOptions): AuthClient {
  const { apiUrl, authMode = 'cookie' } = opts
  const ep = {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh-token',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    mfaSetup: '/auth/mfa/setup',
    mfaEnable: '/auth/mfa/enable',
    mfaVerify: '/auth/mfa/verify',
    mfaDisable: '/auth/mfa/disable',
    me: '/users/me',
    ...opts.endpoints
  }
  const credentials: RequestCredentials = authMode === 'cookie' ? 'include' : 'same-origin'

  async function call(
    path: string,
    { body, bearer, method = 'POST' }: { body?: unknown; bearer?: string; method?: string } = {}
  ): Promise<any> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = bearer ?? (authMode === 'bearer' ? tokenStore.get() : undefined)
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      credentials,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    let data: any = undefined
    try {
      data = await res.json()
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      throw new Error(data?.message ?? res.statusText ?? 'Request failed')
    }
    return data
  }

  return {
    login: (email, password) => call(ep.login, { body: { email, password } }),
    verifyMfa: (code, tempToken) =>
      call(ep.mfaVerify, { body: { token: code }, bearer: tempToken }),
    setupMfa: (tempToken) => call(ep.mfaSetup, { body: {}, bearer: tempToken }),
    enableMfa: (secret, code, tempToken) =>
      call(ep.mfaEnable, { body: { secret, token: code }, bearer: tempToken }),
    disableMfa: () => call(ep.mfaDisable, { body: {} }),
    changePassword: (email, oldPassword, newPassword1, newPassword2) =>
      call(ep.changePassword, { body: { email, oldPassword, newPassword1, newPassword2 } }),
    forgotPassword: (email) => call(ep.forgotPassword, { body: { email } }),
    resetPassword: (code, newPassword1, newPassword2) =>
      call(ep.resetPassword, { body: { code, newPassword1, newPassword2 } }),
    me: () => call(ep.me, { method: 'GET' }),
    logout: () => call(ep.logout, { body: {} }).catch(() => undefined)
  }
}
