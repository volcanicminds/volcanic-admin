/**
 * Token store — access/refresh tokens (BEARER mode) plus the short-lived MFA
 * temp token used between the login `202` response and TOTP verification.
 * COOKIE mode keeps tokens server-side; only the temp token is held here.
 */
const TOKEN_KEY = 'volcanic.admin.token'
const REFRESH_KEY = 'volcanic.admin.refresh'

let tempMfaToken: string | undefined

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? undefined,
  set: (t?: string) =>
    t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY) ?? undefined,
  setRefresh: (t?: string) =>
    t ? localStorage.setItem(REFRESH_KEY, t) : localStorage.removeItem(REFRESH_KEY),

  // MFA temp token lives in memory only (single login attempt).
  getTempMfa: () => tempMfaToken,
  setTempMfa: (t?: string) => {
    tempMfaToken = t
  },

  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
    tempMfaToken = undefined
  }
}
