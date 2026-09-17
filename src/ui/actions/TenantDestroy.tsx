/**
 * Destroying a tenant container, in two phases (backend T-10.21).
 *
 * The generic input dialog cannot do this, and the reason is not cosmetic. The two calls are
 * tied: the first reports exactly what would be destroyed and returns a permission that is shown
 * once and expires, and the second wants that permission back together with the slug typed by
 * hand and a second factor. A dialog with three text fields would ask an operator to produce a
 * token it never showed them, and would skip the only screen where the counts can be read before
 * deciding.
 *
 * It calls the endpoints itself rather than through the generic runner: the runner sends one
 * request and reports a toast, and here the answer of the first call is the input of the second.
 * The permission lives in component state for as long as the dialog is open — never in a URL,
 * never in a query string, never written anywhere it could be read back.
 */
import { useState } from 'react'
import { useDataProvider, useInvalidate } from '@refinedev/core'
import { toast } from 'sonner'
import { Trash2, AlertTriangle } from 'lucide-react'
import { interpolatePath } from '@/engine'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { Label } from '@/ui/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import type { ActionComponentProps, ActionRecord } from './types'

/** The sibling capability that reports the counts and mints the permission. */
const PHASE_ONE = 'destruction-request'

interface Plan {
  token: string
  expiresAt?: string
  warning?: string
  preview?: { rowCounts?: Record<string, number> } & Record<string, unknown>
}

const counts = (plan: Plan | null): [string, number][] =>
  Object.entries(plan?.preview?.rowCounts ?? {}).filter(([, n]) => typeof n === 'number')

export function TenantDestroy({ capability, record, model, t }: ActionComponentProps) {
  const dataProvider = useDataProvider()
  const invalidate = useInvalidate()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [slug, setSlug] = useState('')
  const [otp, setOtp] = useState('')

  const phaseOne = model?.actions.find((a) => a.name === PHASE_ONE)
  const expected = String((record as ActionRecord)?.slug ?? '')
  // The confirm stays shut until the operator has retyped the slug exactly and produced a code.
  // The backend refuses the same two things; this only spares a token that expires.
  const ready = Boolean(plan?.token) && slug === expected && expected !== '' && otp.trim() !== ''

  const call = async (path: string, method: 'post' | 'delete', payload?: ActionRecord) => {
    const provider = dataProvider()
    if (!provider.custom) throw new Error('Actions require a data provider with custom() support')
    const { data } = await provider.custom({ url: interpolatePath(path, record), method, payload })
    return data as ActionRecord
  }

  const close = (next: boolean) => {
    setOpen(next)
    if (!next) {
      // Nothing survives the dialog: a token left in state is a token still usable from a
      // screen the operator believes they closed.
      setPlan(null)
      setSlug('')
      setOtp('')
    }
  }

  const check = async () => {
    if (!phaseOne) return
    setBusy(true)
    try {
      setPlan((await call(phaseOne.path, 'post')) as Plan)
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const destroy = async () => {
    setBusy(true)
    try {
      const data = await call(capability.path, 'delete', { token: plan?.token, slug, otp })
      toast.success(data?.alreadyDestroyed ? t('destroy.already') : t('destroy.done'))
      if (model) invalidate({ resource: model.spec.name, invalidates: ['list', 'many', 'detail'] })
      close(false)
    } catch (err) {
      // The dialog stays open with the token intact: the codes the backend answers with
      // (a wrong slug, a wrong code) are worth a second attempt, and a closed dialog would
      // have spent the permission for nothing.
      toast.error((err as { message?: string })?.message ?? t('error.generic'))
    } finally {
      setBusy(false)
    }
  }

  const title = t(capability.label ?? 'destroy.title')

  return (
    <>
      <Button size="icon" variant="ghost" title={title} onClick={(e) => { e.stopPropagation(); close(true) }}>
        <Trash2 />
      </Button>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <div className="flex items-start gap-3 text-left">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{plan ? t('destroy.step2') : t('destroy.step1')}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {!plan ? (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">{t('destroy.warning')}</p>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              {counts(plan).length ? (
                <ul className="divide-y rounded-md border">
                  {counts(plan).map(([name, n]) => (
                    <li key={name} className="flex items-center justify-between px-3 py-1.5">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium tabular-nums">{n}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{t('destroy.empty')}</p>
              )}

              <p className="text-muted-foreground">{t('destroy.tokenOnce')}</p>
              {plan.expiresAt && (
                <p className="text-muted-foreground">
                  {t('destroy.expires')} {new Date(plan.expiresAt).toLocaleString()}
                </p>
              )}
              {plan.warning && <p className="text-destructive">{plan.warning}</p>}

              <div className="space-y-1.5">
                <Label htmlFor="destroy-slug">{t('destroy.slug')}</Label>
                <Input
                  id="destroy-slug"
                  autoComplete="off"
                  placeholder={expected}
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="destroy-otp">{t('destroy.otp')}</Label>
                <Input
                  id="destroy-otp"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => close(false)}>
              {t('action.cancel')}
            </Button>
            {!plan ? (
              <Button type="button" disabled={busy || !phaseOne} onClick={check}>
                {t('destroy.check')}
              </Button>
            ) : (
              <Button type="button" variant="destructive" disabled={busy || !ready} onClick={destroy}>
                {t('destroy.confirm')}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
