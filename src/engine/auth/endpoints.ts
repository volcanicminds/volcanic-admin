/**
 * The auth routes of each plane (T-10.14).
 *
 * `tenant` is a customer's users, `control` the platform's operators. A console works on one of
 * the two: the tenant login resolves users inside a container, and an operator is not there.
 * The control plane has no self-service password routes and no MFA disable: those keys are
 * absent, and a call to one of them is refused by the client instead of reaching the wrong route.
 *
 * There is no login route: a login is a flow (`flowStart`, then `flowStep` until the session), and
 * the second factor is one of its stages, not a route of its own. The MFA routes left are account
 * management, for a session already complete.
 */
export type Plane = 'tenant' | 'control'

const flowEndpoints = (prefix: string) => ({
  flowOptions: `${prefix}/flow/options`,
  flowStart: `${prefix}/flow/start`,
  flowStep: `${prefix}/flow/step`,
  flowChallenge: `${prefix}/flow/challenge`,
  flowCancel: `${prefix}/flow/cancel`
})

export const PLANE_ENDPOINTS: Record<Plane, Readonly<Record<string, string>>> = {
  tenant: {
    ...flowEndpoints('/auth'),
    logout: '/auth/logout',
    refresh: '/auth/refresh-token',
    changePassword: '/auth/change-password',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    mfaSetup: '/auth/mfa/setup',
    mfaEnable: '/auth/mfa/enable',
    mfaDisable: '/auth/mfa/disable',
    me: '/users/me'
  },
  control: {
    ...flowEndpoints('/system/auth'),
    logout: '/system/auth/logout',
    refresh: '/system/auth/refresh-token',
    mfaSetup: '/system/auth/mfa/setup',
    mfaEnable: '/system/auth/mfa/enable',
    me: '/system/auth/me'
  }
}

/** Where a console of each plane reads its manifest at runtime. */
export const MANIFEST_PATH: Record<Plane, string> = {
  tenant: '/admin/manifest',
  control: '/system/manifest'
}
