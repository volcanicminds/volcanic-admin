/**
 * The one place a request to the backend gets its credentials (T-10.12).
 *
 * Context headers (the tenant), a JSON content type only when a body is sent, the bearer token in
 * bearer mode, cookies in cookie mode, and one renewal on a 401. The data provider and the
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
}

/** Sends a request and returns the response as it came, errors included: the caller decides. */
export type ApiRequest = (input: string, init?: RequestInit) => Promise<Response>

export function createApiRequest(opts: ApiRequestOptions): ApiRequest {
  const { authMode = 'cookie', getToken, getContextHeaders, renewSession } = opts

  async function send(input: string, init: RequestInit = {}, renewed = false): Promise<Response> {
    const headers: Record<string, string> = {
      ...(getContextHeaders?.() ?? {}),
      ...((init.headers as Record<string, string>) ?? {})
    }
    // Only declare a JSON body when one is actually sent. A bodyless request
    // (e.g. DELETE /resource/:id) with Content-Type: application/json trips
    // Fastify's FST_ERR_CTP_EMPTY_JSON_BODY.
    if (init.body != null && !Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) {
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
      return send(input, init, true)
    }
    return res
  }

  return (input, init) => send(input, init)
}
