/**
 * Login: the backend's login flow (docs/AUTH_FLOW_V5.md of the backend).
 *
 * The first screen draws the identifiers the plane offers (`GET .../flow/options`): a password,
 * a code by email, a button per external provider. Every later screen draws the stage the backend
 * answered, option by option: a TOTP code, an email code with its resend, a forced TOTP enrolment.
 * An external provider takes the page away; the console marks it before leaving and resumes the
 * flow with a step when the provider sends the browser back. Methods and providers are drawn by id
 * with this console's own labels: the backend sends codes, never labels.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useLogin } from '@refinedev/core'
import { useAuthClient, useTenant, useT, tokenStore } from '@/engine'
import type { FlowOption, FlowPending } from '@/engine'
import { FLOW_ENDING_CODES } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { useAdminConfig } from '@/ui/config'
import vmLogoLight from '@/assets/volcanicminds-light.svg'
import vmLogoDark from '@/assets/volcanicminds-dark.svg'

const otpClass = 'text-center font-mono text-xl tracking-[0.4em]'

// A refusal code and the key that says it. A code missing here shows the backend's message.
const ERROR_KEYS: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'error.invalidCredentials',
  PASSWORD_TO_BE_CHANGED: 'error.passwordExpired',
  TENANT_NOT_FOUND: 'login.error.unknownOrganization',
  FLOW_CODE_INVALID: 'login.error.codeInvalid',
  FLOW_CODE_EXPIRED: 'login.error.codeExpired',
  FLOW_SEND_LIMIT: 'login.error.sendLimit',
  FLOW_ATTEMPTS_EXHAUSTED: 'login.error.attemptsExhausted',
  FLOW_EXPIRED: 'login.error.flowExpired',
  FLOW_REQUIRED: 'login.error.flowExpired',
  FLOW_ENROLMENT_REFUSED: 'login.error.enrolmentRefused',
  FLOW_METHOD_NOT_ALLOWED: 'login.error.methodNotAllowed',
  IDP_DENIED: 'login.error.idpDenied',
  IDP_RETURN_INVALID: 'login.error.idpFailed',
  IDP_UNAVAILABLE: 'login.error.idpFailed',
  IDP_UNKNOWN_PROVIDER: 'login.error.idpFailed',
  IDP_IDENTITY_NOT_LINKED: 'login.error.idpNotLinked',
  ACCOUNT_PENDING_APPROVAL: 'login.error.pendingApproval'
}

/** The methods this console can draw as a stage. Any other is a consumer's, and ends in a message. */
const DRAWN_STAGES = new Set(['totp', 'email-otp'])

/** How long a provider's return may lag behind the step, in tries one second apart. */
const RETURN_TRIES = 5

interface LoginFailure {
  message?: string
  code?: string
  remaining?: number
  retryAt?: string
}

/** A path the provider's return may land on: this console's own, never another host. */
function safePath(value: string | null): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return undefined
  return value
}

export function LoginView() {
  const { mutateAsync: login, isLoading } = useLogin()
  const client = useAuthClient()
  const t = useT()
  const { branding, plane } = useAdminConfig()
  // T-10.15: a multi-tenant console that serves more than one customer asks which one. The login
  // resolves the user inside that tenant, and from then on the token binds it.
  const { asksTenant, currentTenantId, setTenant } = useTenant()
  const appName = branding?.appName ?? 'Volcanic Admin'
  // Login shows a bigger, centered "hero" logo: its own richer mark if provided,
  // otherwise the sidebar logo, at login-specific (larger) sizes.
  const loginLogo = branding?.loginLogo ?? branding?.logo
  const loginLogoDark = branding?.loginLogoDark ?? branding?.logoDark
  const loginLogoHeight = branding?.loginLogoHeight ?? 56
  const loginLogoMaxWidth = branding?.loginLogoMaxWidth ?? 260
  // "powered by Volcanic Minds" signature (theme-aware). On by default; hide via
  // branding.poweredBy === false for a white-label deployment.
  const showPoweredBy = branding?.poweredBy !== false
  const logoStyle = { height: loginLogoHeight, maxWidth: loginLogoMaxWidth }

  const [tenant, setTenantInput] = useState(currentTenantId ?? '')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  // The identifiers of the plane. Unknown until read (and before a tenant is named, where the
  // header resolver needs one): the password alone, the framework's default, is drawn meanwhile.
  const [identifiers, setIdentifiers] = useState<FlowOption[] | null>(null)
  const [pending, setPending] = useState<FlowPending | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [returning, setReturning] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const loadIdentifiers = useCallback(() => {
    client
      .flowOptions()
      .then((res) => setIdentifiers(res.options))
      .catch(() => setIdentifiers(null))
  }, [client])

  useEffect(() => {
    if (!asksTenant || currentTenantId) loadIdentifiers()
  }, [asksTenant, currentTenantId, loadIdentifiers])

  // The resend countdown of an email code.
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending])

  const describe = useCallback(
    (e: LoginFailure | undefined, fallback: string) => {
      const key = e?.code ? ERROR_KEYS[e.code] : undefined
      const text = key ? t(key) : (e?.message ?? fallback)
      return e?.remaining !== undefined && e.remaining > 0
        ? `${text} ${t('login.error.remaining', { remaining: e.remaining })}`
        : text
    },
    [t]
  )

  const restart = useCallback(() => {
    setPending(null)
    setChosen(null)
    setCode('')
  }, [])

  /** One request of the flow, and what the screen does with its answer. */
  const run = useCallback(
    async (params: Record<string, unknown>): Promise<LoginFailure | undefined> => {
      setError(null)
      const result: any = await login(params)
      if (!result?.success) {
        const failure: LoginFailure = result?.error ?? {}
        if (failure.code && FLOW_ENDING_CODES.has(failure.code)) restart()
        setError(describe(failure, t('error.invalidCredentials')))
        return failure
      }
      if (!result.pending) return undefined // the session: the provider redirects
      const next: FlowPending = result.pending
      const leaving = next.stage.options.find((o) => o.action)
      if (leaving?.action?.type === 'redirect') {
        // The provider takes the page away. The mark is what the console finds when it comes back.
        tokenStore.setResume(leaving.id)
        window.location.assign(leaving.action.url)
        return undefined
      }
      setPending(next)
      setCode('')
      setChosen((current) =>
        next.stage.options.some((o) => o.id === current) ? current : (next.stage.options[0]?.id ?? null)
      )
      return undefined
    },
    [login, describe, restart, t]
  )

  // The return from an external provider: the browser comes back with nothing but the flow, and
  // the step that follows is what resolves the subject and issues the session (§5.5). A step that
  // overtakes the browser's own arrival answers IDP_RETURN_PENDING, and is repeated.
  const resumed = useRef(false)
  useEffect(() => {
    const method = tokenStore.getResume()
    if (!method || resumed.current) return
    resumed.current = true
    tokenStore.setResume(undefined)
    const redirectTo = safePath(new URLSearchParams(window.location.search).get('returnTo')) ?? '/'
    setReturning(true)
    void (async () => {
      for (let attempt = 1; attempt <= RETURN_TRIES; attempt++) {
        const failure = await run({ flow: 'step', method, redirectTo })
        if (failure?.code !== 'IDP_RETURN_PENDING' || attempt === RETURN_TRIES) break
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
      setReturning(false)
    })()
  }, [run])

  /** Names the tenant before the first request: the auth client reads the header from the store. */
  const nameTenant = (): boolean => {
    if (!asksTenant) return true
    const slug = tenant.trim().toLowerCase()
    if (!slug) {
      setError(t('login.error.organizationRequired'))
      return false
    }
    if (slug !== currentTenantId) setTenant(slug)
    return true
  }

  const offered = (id: string) => identifiers?.some((o) => o.id === id) ?? id === 'password'
  const providers = identifiers?.find((o) => o.id === 'oidc')?.providers ?? []

  const onPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (nameTenant()) void run({ flow: 'start', method: 'password', email, password })
  }

  const onEmailCode = () => {
    if (nameTenant()) void run({ flow: 'start', method: 'email-otp', email })
  }

  const onProvider = (provider: string) => {
    if (!nameTenant()) return
    const returnTo = safePath(window.location.pathname + window.location.search)
    void run({
      flow: 'start',
      method: 'oidc',
      provider,
      ...(returnTo && returnTo !== '/' ? { returnTo } : {})
    })
  }

  const option = pending?.stage.options.find((o) => o.id === chosen)
  const others = pending?.stage.options.filter((o) => o.id !== chosen && DRAWN_STAGES.has(o.id)) ?? []

  const onCode = (e: React.FormEvent) => {
    e.preventDefault()
    if (option) void run({ flow: 'step', method: option.id, code })
  }

  const onEnrol = () => {
    if (option) void run({ flow: 'step', method: option.id, action: 'enrol' })
  }

  const onSend = async () => {
    if (!option) return
    setError(null)
    try {
      // As an identifier the send names the address again; as a verifier it goes to the one on file.
      setPending(await client.flowChallenge(option.id, option.kind === 'identifier' ? { email } : {}))
    } catch (e: any) {
      if (e?.code && FLOW_ENDING_CODES.has(e.code)) restart()
      setError(describe(e, t('error.generic')))
    }
  }

  const onCancel = () => {
    void client.flowCancel()
    restart()
    setError(null)
  }

  const enrolment = option?.enrol
  const setup = typeof enrolment === 'object' ? enrolment : null
  // An email code asked by the address alone still identifies the subject: it is a sign-in, not a second factor.
  const title =
    !pending || option?.kind === 'identifier'
      ? t('login.title')
      : enrolment
        ? t('login.title.enrol')
        : t('login.title.stage')
  // Six digits after a first factor, eight when the address alone asks for the code (F37 of the backend).
  const codeLength = option?.id === 'email-otp' && option.kind === 'identifier' ? 8 : 6
  const resendIn = option?.challenge?.resendAt
    ? Math.max(0, Math.ceil((Date.parse(option.challenge.resendAt) - now) / 1000))
    : 0

  let subtitle = t('login.subtitle')
  if (returning) subtitle = t('login.stage.returning')
  else if (option?.id === 'totp')
    subtitle = setup ? t('login.stage.enrolScan') : enrolment ? t('login.stage.enrol') : t('login.stage.totp')
  else if (option?.id === 'email-otp')
    subtitle = option.challenge
      ? t('login.stage.email-otp', {
          destination: option.challenge.destination
        })
      : t('login.stage.email-otp.send')
  else if (option) subtitle = t('login.stage.unsupported')

  const codeInput = (
    <div className="space-y-1.5">
      <Label htmlFor="login-code">{t('login.code')}</Label>
      <Input
        id="login-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={codeLength}
        placeholder={'0'.repeat(codeLength)}
        className={otpClass}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        autoFocus
      />
    </div>
  )

  const errorLine = error && <p className="text-sm text-destructive">{error}</p>

  const cancelButton = (
    <button
      type="button"
      className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
      onClick={onCancel}
    >
      {t('login.cancel')}
    </button>
  )

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
          {returning ? (
            errorLine
          ) : !pending ? (
            <div className="space-y-4">
              <form className="space-y-4" onSubmit={onPassword}>
                {asksTenant && (
                  <div className="space-y-1.5">
                    <Label htmlFor="tenant">{t('login.organization')}</Label>
                    <Input
                      id="tenant"
                      autoComplete="organization"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={tenant}
                      onChange={(e) => setTenantInput(e.target.value)}
                      // The identifiers are the tenant's: read them once it is named.
                      onBlur={() => {
                        const slug = tenant.trim().toLowerCase()
                        if (slug && slug !== currentTenantId) setTenant(slug)
                      }}
                    />
                  </div>
                )}
                {(offered('password') || offered('email-otp')) && (
                  <div className="space-y-1.5">
                    <Label htmlFor="email">{t('login.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      autoComplete="username"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                )}
                {offered('password') && (
                  <>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">{t('login.password')}</Label>
                        {/* The platform has no self-service reset: operators are provisioned. */}
                        {plane !== 'control' && (
                          <Link
                            to="/forgot-password"
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            {t('login.forgot')}
                          </Link>
                        )}
                      </div>
                      <PasswordInput
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {errorLine}
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {t('login.submit')}
                    </Button>
                  </>
                )}
                {!offered('password') && errorLine}
              </form>
              {(offered('email-otp') || providers.length > 0) && offered('password') && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  {t('login.or')}
                  <span className="h-px flex-1 bg-border" />
                </div>
              )}
              {offered('email-otp') && (
                <Button
                  type="button"
                  variant={offered('password') ? 'outline' : 'default'}
                  className="w-full"
                  disabled={isLoading || !email}
                  onClick={onEmailCode}
                >
                  {t('login.method.email-otp')}
                </Button>
              )}
              {providers.map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={isLoading}
                  onClick={() => onProvider(key)}
                >
                  {t('login.continueWith', {
                    provider: t(`login.provider.${key}`)
                  })}
                </Button>
              ))}
            </div>
          ) : option && DRAWN_STAGES.has(option.id) ? (
            <div className="space-y-4">
              {option.id === 'totp' && enrolment === true && (
                <>
                  {errorLine}
                  <Button type="button" className="w-full" disabled={isLoading} onClick={onEnrol}>
                    {t('login.enrol')}
                  </Button>
                </>
              )}
              {option.id === 'totp' && enrolment !== true && (
                <form className="space-y-4" onSubmit={onCode}>
                  {setup && (
                    <div className="flex flex-col items-center gap-3 rounded-md border p-4">
                      <img src={setup.qrCode} alt={setup.uri} className="h-44 w-44" />
                      <code className="select-all break-all rounded bg-muted px-2 py-1 text-center text-xs">
                        {setup.secret}
                      </code>
                    </div>
                  )}
                  {codeInput}
                  {errorLine}
                  <Button type="submit" className="w-full" disabled={isLoading || code.length < codeLength}>
                    {setup ? t('login.enable') : t('login.verify')}
                  </Button>
                </form>
              )}
              {option.id === 'email-otp' && !option.challenge && (
                <>
                  {errorLine}
                  <Button type="button" className="w-full" disabled={isLoading} onClick={onSend}>
                    {t('login.send')}
                  </Button>
                </>
              )}
              {option.id === 'email-otp' && option.challenge && (
                <form className="space-y-4" onSubmit={onCode}>
                  {codeInput}
                  {errorLine}
                  <Button type="submit" className="w-full" disabled={isLoading || code.length < codeLength}>
                    {t('login.verify')}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    disabled={resendIn > 0}
                    onClick={onSend}
                  >
                    {resendIn > 0 ? t('login.resendIn', { seconds: resendIn }) : t('login.resend')}
                  </button>
                </form>
              )}
              {others.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setChosen(o.id)
                    setCode('')
                    setError(null)
                  }}
                >
                  {t('login.useMethod', {
                    method: t(o.id === 'email-otp' ? 'login.method.email-otp.short' : `login.method.${o.id}`)
                  })}
                </button>
              ))}
              {cancelButton}
            </div>
          ) : (
            <div className="space-y-4">
              {errorLine}
              {cancelButton}
            </div>
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
