/** Reset password — consumes a token from the URL and sets a new password. */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthClient, useT } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/label'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card'

export function ResetPasswordView() {
  const client = useAuthClient()
  const t = useT()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password !== confirm) {
      setError(t('password.mismatch'))
      return
    }
    setLoading(true)
    try {
      await client.resetPassword(token, password, confirm)
      toast.success(t('reset.done'))
      navigate('/login')
    } catch (err: any) {
      setError(err?.message ?? t('reset.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">{t('reset.title')}</CardTitle>
          <CardDescription>
            {token ? t('reset.choose') : t('reset.tokenInvalid')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="pw">{t('password.new')}</Label>
                <PasswordInput id="pw" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">{t('password.confirm')}</Label>
                <PasswordInput id="pw2" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading ? '…' : t('password.update')}
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">{t('reset.requestLink')}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
