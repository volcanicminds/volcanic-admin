/**
 * Account — the logged-in user's own page: profile summary, change password,
 * and MFA management (enable via QR + TOTP, or disable). Distinct from the
 * Operatori (users) CRUD, which manages other accounts.
 */
import { useEffect, useState } from 'react'
import { useGetIdentity, useUpdatePassword } from '@refinedev/core'
import { toast } from 'sonner'
import { ShieldCheck, ShieldOff } from 'lucide-react'
import { useAuthClient } from '@/engine'
import type { MfaSetup } from '@/engine'
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

export function AccountView() {
  const { data: identity } = useGetIdentity<Identity>()
  const { mutate: updatePassword, isLoading: pwLoading } = useUpdatePassword<{
    oldPassword: string
    password: string
    confirmPassword: string
  }>()
  const client = useAuthClient()

  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  const [mfaEnabled, setMfaEnabled] = useState(false)
  const [setup, setSetup] = useState<MfaSetup | null>(null)
  const [code, setCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)

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
            <Button variant="destructive" disabled={mfaBusy} onClick={disable}>
              {mfaBusy ? '…' : 'Disable two-factor'}
            </Button>
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
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="text-sm">{value}</div>
    </div>
  )
}
