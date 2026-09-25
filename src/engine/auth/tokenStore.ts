/**
 * Token store: access/refresh tokens (BEARER mode) plus the state of a login in progress. COOKIE
 * mode keeps the tokens and the flow credential in cookies: only the resume marker is held here.
 */
const TOKEN_KEY = 'volcanic.admin.token'
const REFRESH_KEY = 'volcanic.admin.refresh'
// Session storage, not memory: an external provider takes the whole page away and brings it back,
// and the flow must still be there when it does. Scoped to the tab, gone with it.
const FLOW_KEY = 'volcanic.admin.flow'
const RESUME_KEY = 'volcanic.admin.flow.resume'

const setOrRemove = (storage: Storage, key: string, value?: string) =>
  value ? storage.setItem(key, value) : storage.removeItem(key)

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? undefined,
  set: (t?: string) => setOrRemove(localStorage, TOKEN_KEY, t),
  getRefresh: () => localStorage.getItem(REFRESH_KEY) ?? undefined,
  setRefresh: (t?: string) => setOrRemove(localStorage, REFRESH_KEY, t),

  /** The flow credential (`vf1.`) of a bearer deployment; in cookie mode the backend keeps it in a cookie. */
  getFlow: () => sessionStorage.getItem(FLOW_KEY) ?? undefined,
  setFlow: (t?: string) => setOrRemove(sessionStorage, FLOW_KEY, t),

  /**
   * The method whose provider the browser was sent to. Set before leaving, read once when the
   * console loads again: it is what tells a return from a provider apart from any other visit.
   */
  getResume: () => sessionStorage.getItem(RESUME_KEY) ?? undefined,
  setResume: (method?: string) => setOrRemove(sessionStorage, RESUME_KEY, method),

  /**
   * The session tokens only. A login in progress is left alone: the provider clears the tokens
   * when a console boots in cookie mode, and that boot is also the return from a provider, whose
   * flow must survive it.
   */
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  }
}
