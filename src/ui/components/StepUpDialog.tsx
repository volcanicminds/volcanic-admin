/**
 * The step-up dialog: a route answered 403 `STEP_UP_REQUIRED`, and the person proves, again, to be
 * there before the request is sent a second time (docs/AUTH_FLOW_V5.md §8.5 of the backend).
 *
 * The proof is a flow like the login, for the session already open: a password or an emailed
 * code, then the second factor the account has. The address is the session's own, read from the
 * identity and not typed: the backend refuses any other subject anyway. A method this dialog does
 * not draw (an external provider, an enrolment) ends in "sign in again", which is always a proof.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useGetIdentity, useLogout } from '@refinedev/core'
import { ShieldCheck } from 'lucide-react'
import { useAuthClient, useT, adoptStepUp, FLOW_ENDING_CODES } from '@/engine'
import type { FlowAnswer, FlowOption, FlowPending, StepUpBroker } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/ui/components/ui/dialog'

const otpClass = 'text-center font-mono text-xl tracking-[0.4em]'

// A refusal code and the key that says it. A code missing here shows the backend's message.
const ERROR_KEYS: Record<string, string> = {
  AUTH_INVALID_CREDENTIALS: 'error.invalidCredentials',
  STEP_UP_NOT_AVAILABLE: 'stepUp.error.notAvailable',
  FLOW_CODE_INVALID: 'login.error.codeInvalid',
  FLOW_CODE_EXPIRED: 'login.error.codeExpired',
  FLOW_SEND_LIMIT: 'login.error.sendLimit',
  FLOW_ATTEMPTS_EXHAUSTED: 'login.error.attemptsExhausted',
  FLOW_EXPIRED: 'login.error.flowExpired',
  FLOW_REQUIRED: 'login.error.flowExpired',
  FLOW_METHOD_NOT_ALLOWED: 'login.error.methodNotAllowed'
}

/** The stages this dialog draws: a code, never an enrolment (a session that owed one is not open). */
const drawn = (o: FlowOption) => (o.id === 'totp' || o.id === 'email-otp') && !o.enrol

export function StepUpDialog({ broker }: { broker: StepUpBroker }) {
  const client = useAuthClient()
  const t = useT()
  const { mutate: logout } = useLogout()
  const { data: identity } = useGetIdentity<{ email?: string }>()
  const email = identity?.email ?? ''

  const [open, setOpen] = useState(false)
  const [identifiers, setIdentifiers] = useState<FlowOption[] | null>(null)
  const [pending, setPending] = useState<FlowPending | null>(null)
  const [chosen, setChosen] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Only a new login helps: the session cannot be confirmed, or no drawn method can confirm it.
  const [relogin, setRelogin] = useState(false)
  const [busy, setBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const resolver = useRef<((ok: boolean) => void) | null>(null)

  const finish = useCallback(
    (ok: boolean) => {
      if (!ok) void client.flowCancel()
      resolver.current?.(ok)
      resolver.current = null
      setOpen(false)
    },
    [client]
  )

  useEffect(
    () =>
      broker.register(
        () =>
          new Promise<boolean>((resolve) => {
            resolver.current = resolve
            setPending(null)
            setChosen(null)
            setPassword('')
            setCode('')
            setError(null)
            setRelogin(false)
            setIdentifiers(null)
            setOpen(true)
            client
              .flowOptions()
              .then((res) => setIdentifiers(res.options))
              // The framework's default identifier, as the login page assumes before it knows better.
              .catch(() => setIdentifiers([{ id: 'password', kind: 'identifier' }]))
          })
      ),
    [broker, client]
  )

  // A dialog unmounted while open (a logout elsewhere) must not leave a request waiting for ever.
  useEffect(() => () => resolver.current?.(false), [])

  // The resend countdown of an email code.
  useEffect(() => {
    if (!pending) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [pending])

  const fail = (e: any) => {
    if (e?.code === 'STEP_UP_NOT_AVAILABLE') setRelogin(true)
    if (e?.code && FLOW_ENDING_CODES.has(e.code)) {
      setPending(null)
      setChosen(null)
      setCode('')
    }
    const key = e?.code ? ERROR_KEYS[e.code] : undefined
    const text = key ? t(key) : (e?.message ?? t('error.generic'))
    setError(
      typeof e?.remaining === 'number' && e.remaining > 0
        ? `${text} ${t('login.error.remaining', { remaining: e.remaining })}`
        : text
    )
  }

  /** One request of the flow, and what the dialog does with its answer. */
  const run = async (request: () => Promise<FlowAnswer>) => {
    setBusy(true)
    setError(null)
    try {
      const answer = await request()
      if (answer.session) {
        adoptStepUp(answer.session)
        finish(true)
        return
      }
      const next = answer.pending
      if (!next.stage.options.some(drawn)) {
        void client.flowCancel()
        setRelogin(true)
        return
      }
      setPending(next)
      setCode('')
      setChosen((current) =>
        next.stage.options.some((o) => o.id === current && drawn(o))
          ? current
          : (next.stage.options.find(drawn)?.id ?? null)
      )
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const offered = (id: string) => identifiers?.some((o) => o.id === id) ?? false
  const loading = identifiers === null
  const byCode = !offered('password') && offered('email-otp')
  const noMethod = !loading && !offered('password') && !offered('email-otp')

  const option = pending?.stage.options.find((o) => o.id === chosen)
  const others = pending?.stage.options.filter((o) => o.id !== chosen && drawn(o)) ?? []
  // Six digits after a first factor, eight when the address alone asks for the code (F37 of the backend).
  const codeLength = option?.id === 'email-otp' && option.kind === 'identifier' ? 8 : 6
  const resendIn = option?.challenge?.resendAt
    ? Math.max(0, Math.ceil((Date.parse(option.challenge.resendAt) - now) / 1000))
    : 0

  let description = byCode ? t('stepUp.description.code') : t('stepUp.description')
  if (relogin || noMethod) description = t('stepUp.reloginOnly')
  else if (option?.id === 'totp') description = t('login.stage.totp')
  else if (option?.id === 'email-otp')
    description = option.challenge
      ? t('login.stage.email-otp', { destination: option.challenge.destination })
      : t('login.stage.email-otp.send')

  const onSend = async () => {
    if (!option) return
    setBusy(true)
    setError(null)
    try {
      // As an identifier the send names the address again; as a verifier it goes to the one on file.
      setPending(await client.flowChallenge(option.id, option.kind === 'identifier' ? { email } : {}))
    } catch (e) {
      fail(e)
    } finally {
      setBusy(false)
    }
  }

  const errorLine = error && <p className="text-sm text-destructive">{error}</p>

  const cancel = (
    <Button type="button" variant="outline" disabled={busy} onClick={() => finish(false)}>
      {t('login.cancel')}
    </Button>
  )

  let body: React.ReactNode
  if (relogin || noMethod) {
    body = (
      <div className="flex justify-end gap-2">
        {cancel}
        <Button
          type="button"
          onClick={() => {
            finish(false)
            logout()
          }}
        >
          {t('stepUp.relogin')}
        </Button>
      </div>
    )
  } else if (!pending) {
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() =>
            byCode ? client.stepUp('email-otp', { email }) : client.stepUp('password', { email, password })
          )
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="step-up-email">{t('login.email')}</Label>
          <Input id="step-up-email" type="email" autoComplete="username" value={email} readOnly disabled />
        </div>
        {!byCode && (
          <div className="space-y-1.5">
            <Label htmlFor="step-up-password">{t('login.password')}</Label>
            <PasswordInput
              id="step-up-password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
          </div>
        )}
        {errorLine}
        <div className="flex justify-end gap-2">
          {cancel}
          <Button type="submit" disabled={busy || loading || !email || (!byCode && !password)}>
            {byCode ? t('login.send') : t('stepUp.confirm')}
          </Button>
        </div>
      </form>
    )
  } else if (option?.id === 'email-otp' && !option.challenge) {
    body = (
      <div className="space-y-4">
        {errorLine}
        <div className="flex justify-end gap-2">
          {cancel}
          <Button type="button" disabled={busy} onClick={onSend}>
            {t('login.send')}
          </Button>
        </div>
      </div>
    )
  } else if (option) {
    body = (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void run(() => client.flowStep(option.id, { code }))
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="step-up-code">{t('login.code')}</Label>
          <Input
            id="step-up-code"
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
        {errorLine}
        {option.id === 'email-otp' && (
          <button
            type="button"
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
            disabled={busy || resendIn > 0}
            onClick={onSend}
          >
            {resendIn > 0 ? t('login.resendIn', { seconds: resendIn }) : t('login.resend')}
          </button>
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
        <div className="flex justify-end gap-2">
          {cancel}
          <Button type="submit" disabled={busy || code.length < codeLength}>
            {t('login.verify')}
          </Button>
        </div>
      </form>
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Any close gesture (overlay, esc, ×) gives up, and the refused request keeps its refusal.
        if (!next) finish(false)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-start gap-3 text-left">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="size-5" />
            </span>
            <div className="space-y-1.5">
              <DialogTitle>{t('stepUp.title')}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {body}
      </DialogContent>
    </Dialog>
  )
}
