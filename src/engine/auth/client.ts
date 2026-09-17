/**
 * Auth API client — typed wrapper over the native @volcanicminds/backend auth
 * endpoints. Implemented for the real backend here; the mock provides the same
 * interface. Shapes mirror the framework contract (login may return a `202`-like
 * body with `mfaRequired`/`mfaSetupRequired` + `tempToken`).
 */
import type { AuthMode } from '../providers/http.js'
import { tokenStore } from './tokenStore.js'
import { PLANE_ENDPOINTS, type Plane } from './endpoints.js'

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
  /**
   * Renews the session once, and says whether it now holds a fresh access token. Concurrent
   * callers share one renewal. Optional, so a client written before it still type-checks; without
   * it an expired access token ends the session at the first 401, as before.
   */
  renew?(): Promise<boolean>
}

export interface VolcanicAuthClientOptions {
  apiUrl: string
  authMode?: AuthMode
  /** The identity space to authenticate against (T-10.14). Chooses the default endpoints. Default `tenant`. */
  plane?: Plane
  /** Endpoints that win over the plane's defaults, key by key. */
  endpoints?: Partial<Record<string, string>>
  /**
   * Context headers (the tenant) for every call (T-10.15). Before a session exists the header is
   * the only thing naming the container a login resolves users in; at renewal the access token
   * that named it is gone, and a backend that resolves the tenant from a header needs it declared
   * to know which container the refresh token belongs to.
   */
  getContextHeaders?: () => Record<string, string>
}

export function createVolcanicAuthClient(opts: VolcanicAuthClientOptions): AuthClient {
  const { apiUrl, authMode = 'cookie', getContextHeaders } = opts
  const ep: Record<string, string | undefined> = { ...PLANE_ENDPOINTS[opts.plane ?? 'tenant'], ...opts.endpoints }
  const credentials: RequestCredentials = authMode === 'cookie' ? 'include' : 'same-origin'

  interface CallOptions {
    body?: unknown
    bearer?: string
    method?: string
    /** Send no Authorization header whatever the store holds (the renewal itself). */
    anonymous?: boolean
    headers?: Record<string, string>
    /**
     * Try one renewal on a 401 before failing. Off for the calls whose 401 is the answer itself:
     * the login and its MFA steps, the renewal, the logout, the public password flows.
     */
    renewable?: boolean
  }

  async function call(path: string | undefined, opts: CallOptions = {}, renewed = false): Promise<any> {
    if (!path) {
      // A route this plane does not have (the platform has no self-service password reset):
      // refused here rather than sent to `${apiUrl}undefined`.
      throw Object.assign(new Error('Not available on this plane'), { code: 'ENDPOINT_NOT_AVAILABLE' })
    }
    const { body, bearer, method = 'POST', anonymous = false, renewable = false } = opts
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(getContextHeaders?.() ?? {}),
      ...opts.headers
    }
    const token = anonymous ? undefined : (bearer ?? (authMode === 'bearer' ? tokenStore.get() : undefined))
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${apiUrl}${path}`, {
      method,
      headers,
      credentials,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
    if (res.status === 401 && renewable && !renewed && (await renew())) {
      return call(path, opts, true)
    }
    let data: any = undefined
    try {
      data = await res.json()
    } catch {
      /* empty body */
    }
    if (!res.ok) {
      // The status and the machine `code` travel with the error, not just the prose. From v5
      // the prose is the part that can be missing — `HIDE_ERROR_DETAILS` defaults to on in
      // production — while the code is the contract: `PASSWORD_TO_BE_CHANGED` is what tells a
      // login screen to ask for a new password instead of repeating "wrong credentials".
      const message = data?.message || res.statusText || 'Request failed'
      throw Object.assign(new Error(message), {
        status: res.status,
        statusCode: res.status,
        code: typeof data?.code === 'string' ? data.code : undefined
      })
    }
    return data
  }

  // One renewal at a time: a screen that fires ten requests with an expired token must not
  // spend ten refresh tokens, and in bearer mode the second renewal would race the first
  // one's write to the store.
  let renewing: Promise<boolean> | null = null

  async function attemptRenewal(): Promise<boolean> {
    try {
      if (authMode === 'bearer') {
        const token = tokenStore.get()
        const refreshToken = tokenStore.getRefresh()
        if (!token || !refreshToken) return false
        const data = await call(ep.refresh, { body: { token, refreshToken }, anonymous: true })
        if (!data?.token) return false
        tokenStore.set(data.token)
        return true
      }
      // Cookie mode: the refresh token is an httpOnly cookie limited to this route, and the
      // answer is a new access cookie. Nothing to read, nothing to store.
      await call(ep.refresh, { body: {}, anonymous: true })
      return true
    } catch {
      return false
    }
  }

  function renew(): Promise<boolean> {
    // Released in `.finally`, which runs after the assignment even when the attempt settles
    // synchronously; a `finally` inside the attempt could run first and leave a settled
    // promise here for good.
    renewing ??= attemptRenewal().finally(() => {
      renewing = null
    })
    return renewing
  }

  return {
    // Anonymous: a stored bearer token is at best stale and at worst from the other plane, and
    // the backend refuses a control login that carries a tenant token (403 SCOPE_MISMATCH),
    // which is the very session a console that switches plane is replacing.
    login: (email, password) => call(ep.login, { body: { email, password }, anonymous: true }),
    // The pre-auth token travels in the header for the tenant plane and in the body for the
    // control plane, in bearer mode; in cookie mode it is a cookie and `tempToken` is undefined.
    verifyMfa: (code, tempToken) =>
      call(ep.mfaVerify, { body: { token: code, tempToken }, bearer: tempToken }),
    setupMfa: (tempToken) => call(ep.mfaSetup, { body: {}, bearer: tempToken }),
    enableMfa: (secret, code, tempToken) =>
      call(ep.mfaEnable, { body: { secret, token: code }, bearer: tempToken }),
    disableMfa: () => call(ep.mfaDisable, { body: {}, renewable: true }),
    changePassword: (email, oldPassword, newPassword1, newPassword2) =>
      call(ep.changePassword, {
        body: { email, oldPassword, newPassword1, newPassword2 },
        renewable: true
      }),
    forgotPassword: (email) => call(ep.forgotPassword, { body: { email }, anonymous: true }),
    resetPassword: (code, newPassword1, newPassword2) =>
      call(ep.resetPassword, { body: { code, newPassword1, newPassword2 }, anonymous: true }),
    me: () => call(ep.me, { method: 'GET', renewable: true }),
    logout: () => call(ep.logout, { body: {} }).catch(() => undefined),
    renew
  }
}
