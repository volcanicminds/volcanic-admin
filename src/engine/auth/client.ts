/**
 * Auth API client: typed wrapper over the native @volcanicminds/backend auth endpoints.
 * Implemented for the real backend here; the mock provides the same interface. A login is a flow
 * (docs/AUTH_FLOW_V5.md of the backend): `flowStart` runs an identifier, then `flowStep` answers
 * each stage, until one of them answers with the session.
 */
import type { AuthMode } from '../providers/http.js'
import { tokenStore } from './tokenStore.js'
import { PLANE_ENDPOINTS, type Plane } from './endpoints.js'

export interface AuthData {
  token?: string
  refreshToken?: string
  [key: string]: unknown
}

export interface MfaSetup {
  /** Data-URL of the QR code image. */
  qrCode: string
  /** otpauth:// URI. */
  uri: string
  /** Base32 shared secret (manual entry). */
  secret: string
}

/** A code sent to the subject: where, masked, and when it may be asked again. */
export interface FlowChallenge {
  channel: string
  destination: string
  expiresAt: string
  resendAt?: string
}

/**
 * One way through a stage, by method `id`: codes and identifiers only, never a label, so the
 * console draws its own. `enrol` is `true` while an enrolment is owed and not started, then the
 * setup to show; `action` sends the browser elsewhere (an external provider).
 */
export interface FlowOption {
  id: string
  kind: 'identifier' | 'verifier'
  challenge?: FlowChallenge
  enrol?: true | MfaSetup
  action?: { type: 'redirect'; url: string } | { type: 'post'; url: string; fields: Record<string, string> }
  /** The provider keys of an `oidc` identifier, in the options of a plane. */
  providers?: string[]
}

/** A partial authentication (202): the stage owed next. */
export interface FlowPending {
  expiresAt: string
  stage: { options: FlowOption[] }
}

/** What a flow request ends in: the session, or the next stage. */
export type FlowAnswer = { session: AuthData; pending?: undefined } | { pending: FlowPending; session?: undefined }

/** `GET .../flow/options`: the identifiers of the plane and, on the tenant plane, who may register. */
export interface FlowOptions {
  options: FlowOption[]
  accountCreation?: 'invite' | 'approval' | 'open'
}

/**
 * The refusals that end the flow they answer (docs/AUTH_FLOW_V5.md §11): after one of these the
 * stored credential names nothing, and a login screen goes back to its first step.
 */
export const FLOW_ENDING_CODES: ReadonlySet<string> = new Set([
  'AUTH_INVALID_CREDENTIALS',
  'AUTH_INPUT_INVALID',
  'FLOW_REQUIRED',
  'FLOW_EXPIRED',
  'FLOW_ATTEMPTS_EXHAUSTED',
  'FLOW_ENROLMENT_REFUSED',
  'IDP_UNKNOWN_PROVIDER',
  'IDP_UNAVAILABLE',
  'IDP_RETURN_INVALID',
  'IDP_DENIED',
  'IDP_IDENTITY_NOT_LINKED',
  'ACCOUNT_PENDING_APPROVAL'
])

export interface AuthClient {
  flowOptions(): Promise<FlowOptions>
  /** Runs the identifier `method` with its input (`email`, `password`, `provider`, ...). */
  flowStart(method: string, input?: Record<string, unknown>): Promise<FlowAnswer>
  /** Answers the current stage with `method`; `action: 'enrol'` starts an enrolment instead. */
  flowStep(method: string, input?: Record<string, unknown>, action?: 'enrol'): Promise<FlowAnswer>
  /** Sends a code again, within the backend's ceilings. */
  flowChallenge(method: string, input?: Record<string, unknown>): Promise<FlowPending>
  /** Ends the flow in progress, if any. Never fails. */
  flowCancel(): Promise<void>
  /** Account management: need a complete session. */
  setupMfa(): Promise<MfaSetup>
  enableMfa(secret: string, code: string): Promise<unknown>
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
    method?: string
    /** Send no Authorization header whatever the store holds (the renewal, the login flow). */
    anonymous?: boolean
    headers?: Record<string, string>
    /**
     * Try one renewal on a 401 before failing. Off for the calls whose 401 is the answer itself:
     * the login flow, the renewal, the logout, the public password flows.
     */
    renewable?: boolean
    /** Hand the status back with the body: a flow answers 200 and 202 with different bodies. */
    withStatus?: boolean
  }

  async function call(path: string | undefined, opts: CallOptions = {}, renewed = false): Promise<any> {
    if (!path) {
      // A route this plane does not have (the platform has no self-service password reset):
      // refused here rather than sent to `${apiUrl}undefined`.
      throw Object.assign(new Error('Not available on this plane'), { code: 'ENDPOINT_NOT_AVAILABLE' })
    }
    const { body, method = 'POST', anonymous = false, renewable = false } = opts
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(getContextHeaders?.() ?? {}),
      ...opts.headers
    }
    const token = anonymous || authMode !== 'bearer' ? undefined : tokenStore.get()
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
        code: typeof data?.code === 'string' ? data.code : undefined,
        // Attempts left after a wrong code, and when a refused send may be asked again.
        remaining: typeof data?.remaining === 'number' ? data.remaining : undefined,
        retryAt: typeof data?.retryAt === 'string' ? data.retryAt : undefined
      })
    }
    return opts.withStatus ? { status: res.status, data } : data
  }

  // The flow credential travels in the body in bearer mode, never in `Authorization`: that header
  // names a session, and the backend reads it to resolve the tenant. It is sent whenever one is
  // held and stored whenever an answer carries one, whatever the configured mode, because before a
  // manifest the mode is a guess and a cookie deployment answers `flow: null`.
  //
  // Anonymous, all of it: a stored bearer token is at best stale and at worst from the other
  // plane, and the backend refuses a control login that carries a tenant token (403
  // SCOPE_MISMATCH), which is the very session a console that switches plane is replacing.
  async function flowCall(path: string | undefined, body: Record<string, unknown>): Promise<FlowAnswer> {
    const flow = tokenStore.getFlow()
    try {
      const { status, data } = await call(path, { body: flow ? { ...body, flow } : body, anonymous: true, withStatus: true })
      if (status === 202) {
        if (typeof data?.flow === 'string') tokenStore.setFlow(data.flow)
        return { pending: { expiresAt: data.expiresAt, stage: data.stage } }
      }
      tokenStore.setFlow(undefined)
      return { session: data }
    } catch (e: any) {
      if (FLOW_ENDING_CODES.has(e?.code)) tokenStore.setFlow(undefined)
      throw e
    }
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
    flowOptions: () => call(ep.flowOptions, { method: 'GET', anonymous: true }),
    flowStart: (method, input = {}) => {
      // A new login replaces whatever flow the tab still held.
      tokenStore.setFlow(undefined)
      return flowCall(ep.flowStart, { ...input, method })
    },
    flowStep: (method, input = {}, action) => flowCall(ep.flowStep, { ...input, method, ...(action ? { action } : {}) }),
    flowChallenge: async (method, input = {}) => {
      const answer = await flowCall(ep.flowChallenge, { ...input, method })
      if (!answer.pending) throw new Error('A challenge answered with a session')
      return answer.pending
    },
    flowCancel: async () => {
      const flow = tokenStore.getFlow()
      tokenStore.setFlow(undefined)
      await call(ep.flowCancel, { body: flow ? { flow } : {}, anonymous: true }).catch(() => undefined)
    },
    setupMfa: () => call(ep.mfaSetup, { body: {}, renewable: true }),
    enableMfa: (secret, code) => call(ep.mfaEnable, { body: { secret, token: code }, renewable: true }),
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
