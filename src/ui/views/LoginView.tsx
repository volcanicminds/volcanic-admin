/**
 * Login — multi-step to support MFA:
 *   credentials → (mfaRequired) verify TOTP
 *              → (mfaSetupRequired) scan QR + enable TOTP
 * Steps are driven by the auth provider's login response flags. MFA setup data
 * (QR/secret) is fetched from the auth client with the temp token.
 */
import { useState } from 'react'
import { Link } from 'react-router'
import { useLogin } from '@refinedev/core'
import { useAuthClient, tokenStore } from '@/engine'
import type { MfaSetup } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { useAdminConfig } from '@/ui/config'
import vmLogoLight from '@/assets/volcanicminds-light.svg'
import vmLogoDark from '@/assets/volcanicminds-dark.svg'

type Step = 'credentials' | 'verify' | 'setup'

const otpClass =
  'text-center font-mono text-xl tracking-[0.4em]'

export function LoginView() {
  const { mutate: login, isLoading } = useLogin()
  const client = useAuthClient()
  const { branding } = useAdminConfig()
  const appName = branding?.appName ?? 'Volcanic Admin'
  // Login shows a bigger, centered "hero" logo — its own richer mark if provided,
  // otherwise the sidebar logo, at login-specific (larger) sizes.
  const loginLogo = branding?.loginLogo ?? branding?.logo
  const loginLogoDark = branding?.loginLogoDark ?? branding?.logoDark
  const loginLogoHeight = branding?.loginLogoHeight ?? 56
  const loginLogoMaxWidth = branding?.loginLogoMaxWidth ?? 260
  // "powered by Volcanic Minds" signature (theme-aware). On by default; hide via
  // branding.poweredBy === false for a white-label deployment.
  const showPoweredBy = branding?.poweredBy !== false
  const logoStyle = { height: loginLogoHeight, maxWidth: loginLogoMaxWidth }

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [setupData, setSetupData] = useState<MfaSetup | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchSetup = async () => {
    try {
      setSetupData(await client.setupMfa(tokenStore.getTempMfa()))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load MFA setup')
    }
  }

  const onCredentials = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    login(
      { email, password },
      {
        onSuccess: (data: any) => {
          if (!data?.success) {
            setError(data?.error?.message ?? 'Invalid credentials')
            return
          }
          if (data.mfaSetupRequired) {
            setStep('setup')
            fetchSetup()
          } else if (data.mfaRequired) {
            setStep('verify')
          }
          // plain success → provider redirects to '/'
        }
      }
    )
  }

  const onVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    login(
      { mfaStep: 'verify', code },
      {
        onSuccess: (data: any) => {
          if (!data?.success) setError(data?.error?.message ?? 'Invalid code')
        }
      }
    )
  }

  const onEnable = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    login(
      { mfaStep: 'enable', secret: setupData?.secret, code },
      {
        onSuccess: (data: any) => {
          if (!data?.success) setError(data?.error?.message ?? 'Invalid code')
        }
      }
    )
  }

  const title =
    step === 'setup' ? 'Set up two-factor' : step === 'verify' ? 'Two-factor' : 'Sign in'
  const subtitle =
    step === 'setup'
      ? 'Scan the QR with your authenticator, then enter the code'
      : step === 'verify'
        ? 'Enter the 6-digit code from your authenticator'
        : 'Enter your credentials to access'

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center space-y-1 text-center">
          <div className="mb-3 flex flex-col items-center gap-2">
            {loginLogo ? (
              loginLogoDark ? (
                // Two variants swapped by the .dark class (CSS-only, no JS).
                <>
                  <img
                    src={loginLogo}
                    alt={appName}
                    className="block w-auto object-contain dark:hidden"
                    style={logoStyle}
                  />
                  <img
                    src={loginLogoDark}
                    alt={appName}
                    className="hidden w-auto object-contain dark:block"
                    style={logoStyle}
                  />
                </>
              ) : (
                <img src={loginLogo} alt={appName} className="w-auto object-contain" style={logoStyle} />
              )
            ) : (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <span className="text-2xl font-bold">{appName.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-lg font-semibold">{appName}</span>
              </>
            )}
          </div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{subtitle}</CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'credentials' && (
            <form className="space-y-4" onSubmit={onCredentials}>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '…' : 'Sign in'}
              </Button>
            </form>
          )}

          {step === 'verify' && (
            <form className="space-y-4" onSubmit={onVerify}>
              <div className="space-y-1.5">
                <Label htmlFor="totp">Authentication code</Label>
                <Input
                  id="totp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className={otpClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  autoFocus
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
                {isLoading ? '…' : 'Verify'}
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setStep('credentials')
                  setCode('')
                }}
              >
                Cancel
              </button>
            </form>
          )}

          {step === 'setup' && (
            <form className="space-y-4" onSubmit={onEnable}>
              {setupData ? (
                <div className="flex flex-col items-center gap-3 rounded-md border p-4">
                  <img src={setupData.qrCode} alt={setupData.uri} className="h-44 w-44" />
                  <code className="select-all break-all rounded bg-muted px-2 py-1 text-center text-xs">
                    {setupData.secret}
                  </code>
                </div>
              ) : (
                <p className="text-center text-sm text-muted-foreground">Loading…</p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="totp-setup">Authentication code</Label>
                <Input
                  id="totp-setup"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  className={otpClass}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading || code.length < 6 || !setupData}>
                {isLoading ? '…' : 'Enable & continue'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {showPoweredBy && (
        <a
          href="https://volcanicminds.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Powered by Volcanic Minds"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 opacity-80 transition-opacity hover:opacity-100 md:left-auto md:right-8 md:translate-x-0"
        >
          {/* Light/dark variants swapped by the .dark class (CSS-only). */}
          <img src={vmLogoLight} alt="Volcanic Minds" className="block h-8 w-auto dark:hidden" />
          <img src={vmLogoDark} alt="Volcanic Minds" className="hidden h-8 w-auto dark:block" />
        </a>
      )}
    </div>
  )
}
