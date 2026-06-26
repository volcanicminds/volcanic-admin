/** Reset password — consumes a token from the URL and sets a new password. */
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { useAuthClient } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/label'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card'

export function ResetPasswordView() {
  const client = useAuthClient()
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
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await client.resetPassword(token, password)
      toast.success('Password updated. Please sign in.')
      navigate('/login')
    } catch (err: any) {
      setError(err?.message ?? 'Reset failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Set a new password</CardTitle>
          <CardDescription>
            {token ? 'Choose a new password for your account.' : 'Missing or invalid reset token.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <form className="space-y-4" onSubmit={submit}>
              <div className="space-y-1.5">
                <Label htmlFor="pw">New password</Label>
                <PasswordInput id="pw" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pw2">Confirm password</Label>
                <PasswordInput id="pw2" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading ? '…' : 'Update password'}
              </Button>
            </form>
          ) : (
            <Button asChild variant="outline" className="w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
