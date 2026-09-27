/**
 * The one place a request to the backend gets its credentials (T-10.12).
 *
 * Context headers (the tenant), a JSON content type only when a body is sent, the bearer token in
 * bearer mode, cookies in cookie mode, one renewal on a 401, and one confirmation of identity on a
 * 403 `STEP_UP_REQUIRED`. The data provider and the
 * manifest loader share it, so the two cannot disagree on how a request authenticates: before
 * this, the manifest fetch sent cookies only and never passed in bearer mode.
 */
export type AuthMode = 'bearer' | 'cookie'

export interface ApiRequestOptions {
  authMode?: AuthMode
  /** Access token getter (bearer mode). */
  getToken?: () => string | undefined
  /** Extra headers, e.g. the tenant. */
  getContextHeaders?: () => Record<string, string>
  /**
   * Called once on a 401: when it resolves `true` the request is sent again, with whatever
   * credential the renewal left. The retry rebuilds the headers, so a bearer token written by the
   * renewal is the one it carries.
   */
  renewSession?: () => Promise<boolean>
  /**
   * Called once on a 403 `STEP_UP_REQUIRED` (a route that wants the person to prove, again, to be
   * there): when it resolves `true` the request is sent again, with the access token the step-up
   * left. `maxAge` is the backend's window, in seconds.
   */
  confirmIdentity?: (maxAge?: number) => Promise<boolean>
}

/** The `maxAge` of a 403 that asks for a step-up, or null for any other 403. Never consumes `res`. */
export async function stepUpRequired(res: Response): Promise<{ maxAge?: number } | null> {
  if (res.status !== 403) return null
  const body: any = await res
    .clone()
    .json()
    .catch(() => undefined)
  if (body?.code !== 'STEP_UP_REQUIRED') return null
  return { maxAge: typeof body.maxAge === 'number' ? body.maxAge : undefined }
}

/** Sends a request and returns the response as it came, errors included: the caller decides. */
export type ApiRequest = (input: string, init?: RequestInit) => Promise<Response>

export function createApiRequest(opts: ApiRequestOptions): ApiRequest {
  const { authMode = 'cookie', getToken, getContextHeaders, renewSession, confirmIdentity } = opts

  async function send(input: string, init: RequestInit = {}, renewed = false, confirmed = false): Promise<Response> {
    const headers: Record<string, string> = {
      ...(getContextHeaders?.() ?? {}),
      ...((init.headers as Record<string, string>) ?? {})
    }
    // Only declare a JSON body when one is actually sent. A bodyless request
    // (e.g. DELETE /resource/:id) with Content-Type: application/json trips
    // Fastify's FST_ERR_CTP_EMPTY_JSON_BODY. A multipart body gets no header at all: the
    // browser writes it, with the boundary.
    if (
      init.body != null &&
      !(init.body instanceof FormData) &&
      !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')
    ) {
      headers['Content-Type'] = 'application/json'
    }
    if (authMode === 'bearer') {
      const token = getToken?.()
      if (token) headers.Authorization = `Bearer ${token}`
    }
    const res = await fetch(input, {
      ...init,
      headers,
      credentials: authMode === 'cookie' ? 'include' : 'same-origin'
    })
    // An expired access token is not the end of the session while a refresh token is still
    // good (T-10.39): renew once, then send the same request again.
    if (res.status === 401 && renewSession && !renewed && (await renewSession())) {
      return send(input, init, true, confirmed)
    }
    // Once only: a request refused again right after a step-up is refused for good, and asking
    // twice would trap the person in a loop of dialogs.
    if (confirmIdentity && !confirmed) {
      const stepUp = await stepUpRequired(res)
      if (stepUp && (await confirmIdentity(stepUp.maxAge))) return send(input, init, renewed, true)
    }
    return res
  }

  return (input, init) => send(input, init)
}
