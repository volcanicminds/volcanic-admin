/** Forgot password — requests a reset link via the native /auth/forgot-password. */
import { useState } from 'react'
import { Link } from 'react-router'
import { useForgotPassword } from '@refinedev/core'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/components/ui/card'

export function ForgotPasswordView() {
  const { mutate: forgot, isLoading } = useForgotPassword()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">Reset password</CardTitle>
          <CardDescription>
            {sent ? 'If the email exists, a reset link has been sent.' : 'Enter your account email.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sent ? (
            <Button asChild variant="outline" className="w-full">
              <Link to="/login">Back to sign in</Link>
            </Button>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                forgot({ email }, { onSuccess: () => setSent(true) })
              }}
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? '…' : 'Send reset link'}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
