/**
 * Account — the logged-in user's own page: profile summary, change password,
 * and MFA management (enable via QR + TOTP, or disable). Distinct from the
 * Operatori (users) CRUD, which manages other accounts.
 */
import { useCallback, useEffect, useState } from 'react'
import { useDataProvider, useGetIdentity, useUpdatePassword } from '@refinedev/core'
import { toast } from 'sonner'
import { ShieldCheck, ShieldOff, Sun, Moon, Monitor } from 'lucide-react'
import { useAuthClient, useModel } from '@/engine'
import type { MfaSetup } from '@/engine'
import { ConfirmDialog } from '@/ui/components/ConfirmDialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/components/ui/table'
import { cn } from '@/lib/utils'
import { useTheme, type ThemeMode } from '@/ui/theme'
import { useAdminConfig } from '@/ui/config'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import { Badge } from '@/ui/components/ui/badge'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'

interface Identity {
  firstName?: string
  lastName?: string
  email?: string
  username?: string
  roles?: string[]
  mfaEnabled?: boolean
  mfa?: { enabled?: boolean }
}

/**
 * One row of `GET /auth/sessions`: a session, not a token.
 *
 * The backend sends no secret and no hash, and `sid` is only a handle: it identifies the session
 * to close, and a session of somebody else answers the same 404 as one that does not exist.
 */
interface SessionRow {
  sid: string
  current: boolean
  createdAt: string
  lastUsedAt: string
  idleExpiresAt: string
  absoluteExpiresAt: string
  ip: string | null
  userAgent: string | null
}

export function AccountView() {
  const { data: identity } = useGetIdentity<Identity>()
  const { mode, setMode } = useTheme()
  const { mutate: updatePassword, isLoading: pwLoading } = useUpdatePassword<{
    oldPassword: string
    password: string
    confirmPassword: string
  }>()
  const client = useAuthClient()
  // The control plane has no password change and no MFA disable for the operator themself
  // (T-10.14): those cards would call routes that do not exist there.
  const { plane } = useAdminConfig()
  const selfService = plane !== 'control'

  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [code, setCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)

  const dataProvider = useDataProvider()
  const model = useModel()
  const [sessions, setSessions] = useState<SessionRow[] | null>(null)
  const [sessionsAvailable, setSessionsAvailable] = useState(true)
  const [closing, setClosing] = useState<string | null>(null)
  const [pendingClose, setPendingClose] = useState<SessionRow | null>(null)

  useEffect(() => {
    setMfaEnabled(Boolean(identity?.mfaEnabled ?? identity?.mfa?.enabled))
  }, [identity])

  const name =
    [identity?.firstName, identity?.lastName].filter(Boolean).join(' ') ||
    identity?.username ||
    identity?.email ||
    '—'

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    updatePassword(
      { oldPassword, password, confirmPassword: confirm },
      {
        onSuccess: (data: any) => {
          if (data?.success !== false) {
            setOldPassword('')
            setPassword('')
            setConfirm('')
          }
        }
      }
    )
  }

  const startEnable = async () => {
    setMfaBusy(true)
    try {
      setSetup(await client.setupMfa())
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to start MFA setup')
    } finally {
      setMfaBusy(false)
    }
  }

  const confirmEnable = async () => {
    if (!setup) return
    setMfaBusy(true)
    try {
      await client.enableMfa(setup.secret, code)
      setMfaEnabled(true)
      setSetup(null)
      setCode('')
      toast.success('Two-factor enabled')
    } catch (e: any) {
      toast.error(e?.message ?? 'Invalid code')
    } finally {
      setMfaBusy(false)
    }
  }

  const disable = async () => {
    setMfaBusy(true)
    try {
      await client.disableMfa()
      setMfaEnabled(false)
      toast.success('Two-factor disabled')
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to disable MFA')
    } finally {
      setMfaBusy(false)
    }
  }

  //
  // Active sessions: every device signed in with this account, and a way to close one.
  //
  // The path comes from the manifest, not from this file: the two planes answer on different
  // routes, and a backend without a session registry has none. The fallback is the plane's own
  // route, for a manifest older than the endpoint.
  const sessionsPath =
    model.manifest.auth.endpoints.sessions ?? (plane === 'control' ? '/system/auth/sessions' : '/auth/sessions')

  const loadSessions = useCallback(async () => {
    const provider = dataProvider()
    if (!provider.custom) {
      setSessionsAvailable(false)
      return
    }
    try {
      const { data } = await provider.custom<SessionRow[]>({ url: sessionsPath, method: 'get' })
      // The HTTP wrapper does not throw on a 4xx, it hands the body back: a deployment without a
      // session registry answers something that is not a list, and that is what tells "no devices"
      // apart from "this build has no registry". The card disappears rather than showing nothing.
      if (!Array.isArray(data)) {
        setSessionsAvailable(false)
        return
      }
      setSessions(data)
    } catch {
      setSessionsAvailable(false)
    }
  }, [dataProvider, sessionsPath])

  useEffect(() => {
    void loadSessions()
  }, [loadSessions])

  const closeSession = async (row: SessionRow) => {
    const provider = dataProvider()
    if (!provider.custom) return
    setClosing(row.sid)
    try {
      await provider.custom({ url: `${sessionsPath}/${row.sid}`, method: 'delete' })
      // Closing the session you are speaking from is a logout on the server, cookies included, so
      // the page has to stop pretending otherwise: a reload lands on the login screen.
      if (row.current) {
        window.location.reload()
        return
      }
      toast.success('Session closed')
      await loadSessions()
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to close the session')
    } finally {
      setClosing(null)
      setPendingClose(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Account</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" value={name} />
          <Field label="Email" value={identity?.email ?? '—'} />
          <Field label="Username" value={identity?.username ?? '—'} />
          <div className="space-y-1">
            <div className="text-xs font-medium text-muted-foreground">Roles</div>
            <div className="flex flex-wrap gap-1">
              {(identity?.roles ?? []).map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">Theme</div>
          <div className="inline-flex rounded-md border p-0.5">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                size="sm"
                variant="ghost"
                className={cn('gap-2', mode === value && 'bg-accent text-foreground')}
                onClick={() => setMode(value)}
              >
                <Icon className="h-4 w-4" /> {label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selfService && (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submitPassword}>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="old">Current password</Label>
              <PasswordInput
                id="old"
                autoComplete="current-password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="new">New password</Label>
              <PasswordInput
                id="new"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm</Label>
              <PasswordInput
                id="confirm"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pwLoading || !oldPassword || !password}>
                {pwLoading ? '…' : 'Update password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Two-factor authentication
            {mfaEnabled ? (
              <Badge className="gap-1">
                <ShieldCheck className="h-3 w-3" /> Enabled
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <ShieldOff className="h-3 w-3" /> Disabled
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mfaEnabled ? (
            selfService ? (
              <Button variant="destructive" disabled={mfaBusy} onClick={disable}>
                {mfaBusy ? '…' : 'Disable two-factor'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Another administrator can reset it.</p>
            )
          ) : setup ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 rounded-md border p-4">
                <img src={setup.qrCode} alt={setup.uri} className="h-44 w-44" />
                <code className="select-all break-all rounded bg-muted px-2 py-1 text-center text-xs">
                  {setup.secret}
                </code>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="enable-code">Authentication code</Label>
                <Input
                  id="enable-code"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className="max-w-40 text-center font-mono text-xl tracking-[0.4em]"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="flex gap-2">
                <Button disabled={mfaBusy || code.length < 6} onClick={confirmEnable}>
                  {mfaBusy ? '…' : 'Confirm & enable'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSetup(null)
                    setCode('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security with a TOTP authenticator app.
              </p>
              <Button disabled={mfaBusy} onClick={startEnable}>
                {mfaBusy ? '…' : 'Enable two-factor'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {sessionsAvailable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active sessions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Every device signed in with this account. Closing one stops it renewing straight away.
            </p>
            {sessions === null ? (
              <p className="text-sm text-muted-foreground">…</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No session is open.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Device</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Last used</TableHead>
                    <TableHead className="w-0" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((row) => (
                    <TableRow key={row.sid}>
                      <TableCell className="max-w-64 truncate">
                        {describeDevice(row.userAgent)}
                        {row.current && (
                          <Badge variant="secondary" className="ml-2">
                            This device
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{row.ip ?? '—'}</TableCell>
                      <TableCell>{formatWhen(row.lastUsedAt)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={closing === row.sid}
                          onClick={() => setPendingClose(row)}
                        >
                          {closing === row.sid ? '…' : 'Close'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={pendingClose !== null}
        onOpenChange={(open) => {
          if (!open) setPendingClose(null)
        }}
        title={pendingClose?.current ? 'Sign out on this device?' : 'Close this session?'}
        description={
          pendingClose?.current
            ? 'You will be signed out here and will have to log in again.'
            : 'That device will have to log in again. Anything it holds stops working at once.'
        }
        confirmLabel="Close session"
        cancelLabel="Cancel"
        destructive
        busy={closing !== null}
        onConfirm={() => {
          if (pendingClose) void closeSession(pendingClose)
        }}
      />
    </div>
  )
}

const THEME_OPTIONS: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor }
]

/**
 * A readable guess at what a device is, and deliberately nothing more.
 *
 * A user agent is not an identification and must not be shown as one: the point of the line is to
 * let someone recognise "the laptop at the office" among three rows, so it says browser and system
 * and stops there.
 */
function describeDevice(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Browser'
  const system = /iPhone|iPad/.test(userAgent)
    ? 'iOS'
    : /Android/.test(userAgent)
      ? 'Android'
      : /Mac OS X/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Linux/.test(userAgent)
            ? 'Linux'
            : ''
  return system ? `${browser} on ${system}` : browser
}

function formatWhen(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
