/**
 * Mock auth client — implements the AuthClient interface in memory so the full
 * login/MFA/password flows are demoable without a backend.
 *
 * Demo accounts (any password except empty):
 *   - mfa@acme.example      → triggers MFA verify (code: 123456)
 *   - setup@acme.example    → triggers forced MFA setup (code: 123456)
 *   - anything else         → direct login
 * MFA enable/verify accept the code "123456". Current password "wrong" fails.
 */
import type { AuthClient, AuthData, LoginResponse, MfaSetup } from '@/engine'

const MFA_KEY = 'volcanic.admin.mock.mfa'
const DEMO_CODE = '123456'

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

export const mockAuthClient: AuthClient = {
  login: async (email, password): Promise<LoginResponse> => {
    if (!password) throw new Error('Invalid credentials')
    currentEmail = email || currentEmail
    if (email === 'mfa@acme.example') return { mfaRequired: true, tempToken: 'mock-temp' }
    if (email === 'setup@acme.example') return { mfaSetupRequired: true, tempToken: 'mock-temp' }
    return authData()
  },

  verifyMfa: async (code) => {
    if (code !== DEMO_CODE) throw new Error('Invalid code')
    return authData()
  },

  setupMfa: async (): Promise<MfaSetup> => {
    const secret = 'JBSWY3DPEHPK3PXP'
    return {
      secret,
      uri: `otpauth://totp/VolcanicAdmin:${currentEmail}?secret=${secret}&issuer=VolcanicAdmin`,
      qrCode: fakeQr(secret)
    }
  },

  enableMfa: async (_secret, code) => {
    if (code !== DEMO_CODE) throw new Error('Invalid code')
    localStorage.setItem(MFA_KEY, '1')
    return authData()
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
  login: async (email, password) => {
    currentRoles = ['system:admin']
    return mockAuthClient.login(email, password)
  },
  me: async () => {
    currentRoles = ['system:admin']
    return identity()
  }
}
