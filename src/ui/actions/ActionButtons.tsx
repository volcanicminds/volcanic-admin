/**
 * Renders manifest action capabilities (kind:'action') as buttons. Row actions
 * are compact icon buttons honoring `visibleWhen`; collection actions are
 * labeled buttons in the list header. A `capability.component` resolves to a
 * custom component from the override registry; otherwise a generic button runs
 * the action via its real endpoint.
 */
import { useState, type ComponentType } from 'react'
import { Check, Archive, Download, RefreshCw, Send, Zap } from 'lucide-react'
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
import { useRegistry, actionsByTarget, matchVisibleWhen } from '@/engine'
import type { CapabilitySpec, ResourceModel } from '@/engine'
import type { TFunc } from '../generators/listShared'
import { useCapabilityRunner } from './useCapabilityRunner'

type Rec = Record<string, any>
type RunFn = (cap: CapabilitySpec, record?: Rec, label?: string, body?: Rec) => void

/** Dialog that prompts for `cap.input.fields` and runs the action with them as the body. */
function ActionInputDialog({
  cap,
  record,
  run,
  label,
  open,
  onOpenChange,
  t
}: {
  cap: CapabilitySpec
  record?: Rec
  run: RunFn
  label: string
  open: boolean
  onOpenChange: (v: boolean) => void
  t: TFunc
}) {
  const [values, setValues] = useState<Rec>({})
  const fields = cap.input?.fields ?? []
  const missing = fields.some((f) => f.required && !values[f.name])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {fields.map((f) => (
            <div key={f.name} className="space-y-1.5">
              <Label>
                {t(f.label ?? `field.${f.name}`)}
                {f.required && <span className="ml-0.5 text-destructive">*</span>}
              </Label>
              <Input
                type={f.widget === 'password' ? 'password' : 'text'}
                placeholder={f.placeholder ? t(f.placeholder) : undefined}
                value={values[f.name] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('action.cancel')}
          </Button>
          <Button
            disabled={missing}
            onClick={() => {
              run(cap, record, label, values)
              onOpenChange(false)
            }}
          >
            {t(cap.input?.submitLabel ?? cap.label ?? 'action.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  check: Check,
  archive: Archive,
  download: Download,
  refresh: RefreshCw,
  send: Send
}
const iconFor = (name?: string) => (name && ICONS[name]) || Zap

function ActionButton({
  cap,
  record,
  run,
  t,
  compact
}: {
  cap: CapabilitySpec
  record?: Rec
  run: RunFn
  t: TFunc
  compact?: boolean
}) {
  const registry = useRegistry()
  const [confirming, setConfirming] = useState(false)
  const [prompting, setPrompting] = useState(false)
  const Icon = iconFor(cap.icon)
  const label = t(cap.label ?? `action.${cap.name}`)

  const Custom = registry.resolve('action', cap.component)
  if (Custom) {
    return <Custom capability={cap} record={record} run={(r?: Rec) => run(cap, r ?? record, label)} t={t} />
  }

  const fire = () => run(cap, record, label)
  const onClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (cap.input) setPrompting(true)
    else if (cap.confirm) setConfirming(true)
    else fire()
  }

  return (
    <>
      {compact ? (
        <Button size="icon" variant="ghost" title={label} onClick={onClick}>
          <Icon />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={onClick}>
          <Icon /> {label}
        </Button>
      )}
      {cap.input && (
        <ActionInputDialog
          cap={cap}
          record={record}
          run={run}
          label={label}
          open={prompting}
          onOpenChange={setPrompting}
          t={t}
        />
      )}
      {cap.confirm && (
        <Dialog open={confirming} onOpenChange={setConfirming}>
          <DialogContent onClick={(e) => e.stopPropagation()}>
            <DialogHeader>
              <DialogTitle>{label}</DialogTitle>
              <DialogDescription>{t(cap.confirmText ?? 'action.confirm')}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirming(false)}>
                {t('action.cancel')}
              </Button>
              <Button
                onClick={() => {
                  fire()
                  setConfirming(false)
                }}
              >
                {label}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

/** Row-target action buttons, filtered by `visibleWhen`. Compact (icon-only) by default. */
export function RowActions({
  model,
  record,
  t,
  compact = true
}: {
  model: ResourceModel
  record: Rec
  t: TFunc
  compact?: boolean
}) {
  const { run } = useCapabilityRunner(model.spec.name)
  const actions = actionsByTarget(model.actions, 'row').filter((a) => matchVisibleWhen(record, a.visibleWhen))
  if (!actions.length) return null
  return (
    <>
      {actions.map((a) => (
        <ActionButton key={a.name} cap={a} record={record} run={run} t={t} compact={compact} />
      ))}
    </>
  )
}

/** Labeled buttons for collection-target actions (list header). */
export function CollectionActions({ model, t }: { model: ResourceModel; t: TFunc }) {
  const { run } = useCapabilityRunner(model.spec.name)
  const actions = actionsByTarget(model.actions, 'collection')
  if (!actions.length) return null
  return (
    <>
      {actions.map((a) => (
        <ActionButton key={a.name} cap={a} run={run} t={t} />
      ))}
    </>
  )
}
