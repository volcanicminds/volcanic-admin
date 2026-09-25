/**
 * Mock auth client: implements the AuthClient interface in memory so the login flow and the
 * password screens are demoable without a backend.
 *
 * Demo accounts (any password except empty):
 *   - mfa@acme.example      asks for a TOTP code (123456)
 *   - setup@acme.example    asks for a forced TOTP enrolment (code 123456)
 *   - anything else         logs in with the password alone
 * An email code asked by the address alone is 12345678 (eight digits, as on the backend); the `demo`
 * provider comes straight back to the console.
 * Current password "wrong" fails.
 */
import type { AuthClient, AuthData, FlowAnswer, FlowOption, FlowPending, MfaSetup } from '@/engine'

const MFA_KEY = 'volcanic.admin.mock.mfa'
const DEMO_CODE = '123456'
const DEMO_IDENTIFIER_CODE = '12345678'

let currentEmail = 'admin@acme.example'
// The plane decides which catalogue the session's roles come from: a tenant's users hold
// application roles, the platform's operators hold `system:` ones and nothing else (T-4.1).
let currentRoles = ['admin']

function identity() {
  const [firstName, lastName] = ['Admin', 'Acme']
  return {
    id: 'u1',
    firstName,
    lastName,
    email: currentEmail,
    username: currentEmail.split('@')[0],
    roles: currentRoles,
    mfaEnabled: localStorage.getItem(MFA_KEY) === '1'
  }
}

function authData(): AuthData {
  return { token: `mock-token-${currentEmail}`, refreshToken: 'mock-refresh', ...identity() }
}

/** A lightweight inline SVG that stands in for a real QR image. */
function fakeQr(secret: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 29 29" shape-rendering="crispEdges">
<rect width="29" height="29" fill="#fff"/>
${Array.from({ length: 29 * 29 })
    .map((_, i) => {
      const x = i % 29
      const y = Math.floor(i / 29)
      // deterministic pattern seeded by the secret so it looks QR-like
      const on = (x * 7 + y * 13 + secret.charCodeAt((x + y) % secret.length)) % 3 === 0
      const finder =
        (x < 7 && y < 7) || (x > 21 && y < 7) || (x < 7 && y > 21)
      return on || finder ? `<rect x="${x}" y="${y}" width="1" height="1" fill="#000"/>` : ''
    })
    .join('')}
</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function mfaSetup(): MfaSetup {
  const secret = 'JBSWY3DPEHPK3PXP'
  return {
    secret,
    uri: `otpauth://totp/VolcanicAdmin:${currentEmail}?secret=${secret}&issuer=VolcanicAdmin`,
    qrCode: fakeQr(secret)
  }
}

function refusal(message: string, code: string, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(message), { status: 401, statusCode: 401, code, ...extra })
}

const inMinutes = (m: number) => new Date(Date.now() + m * 60000).toISOString()

// The stage the mock flow is waiting on.
let stage: FlowOption[] = []

function pending(...options: FlowOption[]): FlowAnswer {
  stage = options
  return { pending: { expiresAt: inMinutes(10), stage: { options } } }
}

const emailChallenge = () => ({
  channel: 'email',
  destination: `${currentEmail.charAt(0)}***@${currentEmail.split('@')[1] ?? 'example'}`,
  expiresAt: inMinutes(5),
  resendAt: new Date(Date.now() + 30000).toISOString()
})

function session(): FlowAnswer {
  stage = []
  return { session: authData() }
}

export const mockAuthClient: AuthClient = {
  flowOptions: async () => ({
    options: [
      { id: 'password', kind: 'identifier' },
      { id: 'email-otp', kind: 'identifier' },
      { id: 'oidc', kind: 'identifier', providers: ['demo'] }
    ]
  }),

  flowStart: async (method, input = {}) => {
    if (method === 'password') {
      if (!input.password) throw refusal('Invalid credentials', 'AUTH_INVALID_CREDENTIALS')
      currentEmail = String(input.email || currentEmail)
      if (currentEmail === 'mfa@acme.example') return pending({ id: 'totp', kind: 'verifier' })
      if (currentEmail === 'setup@acme.example') return pending({ id: 'totp', kind: 'verifier', enrol: true })
      return session()
    }
    if (method === 'email-otp') {
      currentEmail = String(input.email || currentEmail)
      return pending({ id: 'email-otp', kind: 'identifier', challenge: emailChallenge() })
    }
    if (method === 'oidc') {
      // The provider is the console itself: the page reloads and the login resumes.
      return pending({ id: 'oidc', kind: 'identifier', action: { type: 'redirect', url: window.location.href } })
    }
    throw refusal('Method not allowed', 'FLOW_METHOD_NOT_ALLOWED')
  },

  flowStep: async (method, input = {}, action) => {
    // The reload of a provider login empties this module: the return is all the mock checks.
    if (method === 'oidc') return session()
    const option = stage.find((o) => o.id === method)
    if (!option) throw refusal('No flow in progress', 'FLOW_REQUIRED')
    if (action === 'enrol') return pending({ ...option, enrol: mfaSetup() })
    const expected = option.id === 'email-otp' && option.kind === 'identifier' ? DEMO_IDENTIFIER_CODE : DEMO_CODE
    if (input.code !== expected) throw refusal('Invalid code', 'FLOW_CODE_INVALID', { remaining: 4 })
    if (option.enrol) localStorage.setItem(MFA_KEY, '1')
    return session()
  },

  flowChallenge: async (method): Promise<FlowPending> => {
    const option = stage.find((o) => o.id === method)
    if (!option) throw refusal('No flow in progress', 'FLOW_REQUIRED')
    return pending({ ...option, challenge: emailChallenge() }).pending!
  },

  flowCancel: async () => {
    stage = []
  },

  setupMfa: async () => mfaSetup(),

  enableMfa: async (_secret, code) => {
    if (code !== DEMO_CODE) throw new Error('Invalid code')
    localStorage.setItem(MFA_KEY, '1')
    return {}
  },

  disableMfa: async () => {
    localStorage.removeItem(MFA_KEY)
    return {}
  },

  changePassword: async (_email, oldPassword, newPassword1, newPassword2) => {
    if (oldPassword === 'wrong') throw new Error('Current password is incorrect')
    if (newPassword1 !== newPassword2) throw new Error('Passwords do not match')
    return {}
  },

  forgotPassword: async () => ({}),
  resetPassword: async () => ({}),
  me: async () => identity(),
  logout: async () => ({}),
  // The mock session never expires, so there is never anything to renew.
  renew: async () => false
}

/**
 * The same mock on the control plane.
 *
 * A platform identity holds `system:` roles and nothing else (T-4.1), and every capability of
 * the control manifest is gated on them. Signing in here as `admin` would draw an empty console,
 * which is the access control doing its job rather than a bug: hence a client that says which
 * plane its session belongs to.
 */
export const mockControlAuthClient: AuthClient = {
  ...mockAuthClient,
  // The framework's control plane: a password, then TOTP for an operator who has one.
  flowOptions: async () => ({ options: [{ id: 'password', kind: 'identifier' }] }),
  flowStart: async (method, input) => {
    currentRoles = ['system:admin']
    return mockAuthClient.flowStart(method, input)
  },
  me: async () => {
    currentRoles = ['system:admin']
    return identity()
  }
}
