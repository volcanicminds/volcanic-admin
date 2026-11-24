/**
 * Renders manifest action capabilities (kind:'action') as buttons. Row actions
 * are compact icon buttons honoring `visibleWhen`; bulk actions are labeled
 * buttons in the selection bar, run on each selected row they accept;
 * collection actions are labeled buttons in the list header. An action whose
 * path has a `:param` its record cannot fill is not offered. A
 * `capability.component` resolves to a custom component from the override
 * registry; otherwise a generic button runs the action via its real endpoint.
 */
import { useState, type ComponentType } from 'react'
import {
  Check,
  Archive,
  Download,
  RefreshCw,
  Send,
  Star,
  StarOff,
  Zap,
  Ban,
  Unlock,
  KeyRound,
  MoreHorizontal,
  Trash2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/ui/components/ui/dropdown-menu'
import { Button } from '@/ui/components/ui/button'
import { Input } from '@/ui/components/ui/input'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Textarea } from '@/ui/components/ui/textarea'
import { Label } from '@/ui/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import { useRegistry, actionsByTarget, canRunOn, fillsPath } from '@/engine'
import type { CrudFilters } from '@refinedev/core'
import type { ActionInputField, CapabilitySpec, ResolvedField, ResourceModel } from '@/engine'
import { BooleanWidget, DateWidget, emptyToNull } from '@/ui/widgets/inputs'
import type { TFunc } from '../generators/listShared'
import { useCapabilityRunner } from './useCapabilityRunner'

type Rec = Record<string, any>
type RunFn = (cap: CapabilitySpec, record?: Rec, label?: string, body?: Rec) => void

/** A dialog's input as a form field: a date, a datetime or a boolean is drawn and sent as the form does. */
const asField = (f: ActionInputField): ResolvedField => ({ name: f.name, type: f.type ?? 'string', label: f.label, required: f.required })

/** The values entered, a cleared date or choice sent as null (`emptyToNull`); a field never touched is left out. */
export function dialogBody(fields: ActionInputField[], values: Rec): Rec {
  return Object.fromEntries(fields.filter((f) => f.name in values).map((f) => [f.name, emptyToNull(asField(f), values[f.name])]))
}

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
          {fields.map((f) => {
            const set = (value: unknown) => setValues((v) => ({ ...v, [f.name]: value }))
            const common = {
              placeholder: f.placeholder ? t(f.placeholder) : undefined,
              value: values[f.name] ?? '',
              onChange: (e: { target: { value: string } }) => set(e.target.value)
            }
            const field = asField(f)
            // A reason recorded with the operation is prose, not a one-line value (T-10.16).
            const multiline = f.widget === 'textarea' || f.type === 'text' || f.type === 'textarea'
            return (
              <div key={f.name} className="space-y-1.5">
                <Label>
                  {t(f.label ?? `field.${f.name}`)}
                  {f.required && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                {f.widget === 'password' ? (
                  <PasswordInput {...common} />
                ) : field.type === 'date' || field.type === 'datetime' ? (
                  <DateWidget field={field} value={values[f.name]} onChange={set} t={t} />
                ) : field.type === 'boolean' ? (
                  <BooleanWidget field={field} value={values[f.name]} onChange={set} t={t} />
                ) : multiline ? (
                  <Textarea rows={3} {...common} />
                ) : (
                  <Input {...common} />
                )}
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('action.cancel')}
          </Button>
          <Button
            disabled={missing}
            onClick={() => {
              run(cap, record, label, dialogBody(fields, values))
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
  send: Send,
  star: Star,
  'star-off': StarOff,
  // Administrative verbs: blocking an identity, letting it back in, and handing back a second
  // factor. A manifest never names an icon by itself, so these are reachable from an override.
  ban: Ban,
  unlock: Unlock,
  key: KeyRound,
  trash: Trash2
}
const iconFor = (name?: string) => (name && ICONS[name]) || Zap

function ActionButton({
  cap,
  record,
  records,
  run,
  t,
  model,
  filters,
  compact,
  variant,
  size,
  className
}: {
  cap: CapabilitySpec
  record?: Rec
  /** A bulk action's rows: the selected ones it can run on, counted on the button. */
  records?: Rec[]
  run: RunFn
  t: TFunc
  /** The resource the action belongs to, handed to a custom component: without it a component
   * that calls the API itself cannot name what to invalidate, nor reach its sibling actions. */
  model?: ResourceModel
  /** The list's filters, handed to a custom collection action as its selection. */
  filters?: CrudFilters
  compact?: boolean
  /** Button styling overrides so callers can match sibling buttons (card overlay,
   * show header). Fall back to the per-mode defaults when not provided. */
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}) {
  const registry = useRegistry()
  const [confirming, setConfirming] = useState(false)
  const [prompting, setPrompting] = useState(false)
  const Icon = iconFor(cap.icon)
  const label = t(cap.label ?? `action.${cap.name}`)

  const Custom = registry.resolve('action', cap.component)
  if (Custom) {
    return (
      <Custom
        capability={cap}
        record={record}
        records={records}
        model={model}
        filters={filters}
        run={(r?: Rec, body?: Rec) => run(cap, r ?? record, label, body)}
        t={t}
      />
    )
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
        <Button
          size={size ?? 'icon'}
          variant={variant ?? 'ghost'}
          className={className}
          title={label}
          aria-label={label}
          onClick={onClick}
        >
          <Icon />
        </Button>
      ) : (
        <Button
          variant={variant ?? 'outline'}
          size={size ?? 'default'}
          className={className}
          onClick={onClick}
        >
          <Icon /> {label}
          {records && ` (${records.length})`}
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
        <ActionConfirmDialog
          cap={cap}
          label={label}
          open={confirming}
          onOpenChange={setConfirming}
          onConfirm={fire}
          t={t}
        />
      )}
    </>
  )
}

/** The question asked before an action with `confirm`, its button labeled as the action. */
function ActionConfirmDialog({
  cap,
  label,
  open,
  onOpenChange,
  onConfirm,
  t
}: {
  cap: CapabilitySpec
  label: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onConfirm: () => void
  t: TFunc
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{t(cap.confirmText ?? 'action.confirm')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('action.cancel')}
          </Button>
          <Button
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
          >
            {label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * The actions past a bar's inline ones, as items of an "Actions" menu. An item that asks for
 * input or confirmation opens its dialog after the menu closes: the dialogs are rendered beside
 * the menu, not inside it, since the menu's content unmounts on close.
 */
function ActionMenu({
  actions,
  record,
  run,
  t,
  compact,
  variant,
  className
}: {
  actions: CapabilitySpec[]
  record: Rec
  run: RunFn
  t: TFunc
  /** An icon trigger named by its label, as the row's other compact buttons. */
  compact?: boolean
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  className?: string
}) {
  const [open, setOpen] = useState<{ cap: CapabilitySpec; mode: 'input' | 'confirm' } | null>(null)
  const labelOf = (cap: CapabilitySpec) => t(cap.label ?? `action.${cap.name}`)
  return (
    <>
      {/* Not modal: a modal menu handing focus to a dialog it just opened leaves the page inert. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          {compact ? (
            <Button
              size="icon"
              variant={variant ?? 'ghost'}
              className={className}
              title={t('action.menu')}
              aria-label={t('action.menu')}
            >
              <MoreHorizontal />
            </Button>
          ) : (
            <Button variant="outline">
              <MoreHorizontal /> {t('action.menu')}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((cap) => {
            const Icon = iconFor(cap.icon)
            return (
              <DropdownMenuItem
                key={cap.name}
                onSelect={() => {
                  if (cap.input) setOpen({ cap, mode: 'input' })
                  else if (cap.confirm) setOpen({ cap, mode: 'confirm' })
                  else run(cap, record, labelOf(cap))
                }}
              >
                <Icon className="mr-2 h-4 w-4" /> {labelOf(cap)}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {open?.mode === 'input' && (
        <ActionInputDialog
          cap={open.cap}
          record={record}
          run={run}
          label={labelOf(open.cap)}
          open
          onOpenChange={(v) => !v && setOpen(null)}
          t={t}
        />
      )}
      {open?.mode === 'confirm' && (
        <ActionConfirmDialog
          cap={open.cap}
          label={labelOf(open.cap)}
          open
          onOpenChange={(v) => !v && setOpen(null)}
          onConfirm={() => run(open.cap, record, labelOf(open.cap))}
          t={t}
        />
      )}
    </>
  )
}

/**
 * Row-target action buttons, filtered by `visibleWhen`. Compact (icon-only) by default. With
 * `inline`, the actions past that many go into an "Actions" menu; an action drawn by its own
 * component stays a button, since a menu item cannot host it.
 */
export function RowActions({
  model,
  record,
  t,
  compact = true,
  inline,
  variant,
  size,
  className
}: {
  model: ResourceModel
  record: Rec
  t: TFunc
  compact?: boolean
  /** How many actions stay buttons before the rest go into a menu; all of them when unset. */
  inline?: number
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
}) {
  const registry = useRegistry()
  const { run } = useCapabilityRunner(model.spec.name)
  const actions = actionsByTarget(model.actions, 'row').filter((a) => canRunOn(a, record))
  if (!actions.length) return null
  const custom = (a: CapabilitySpec) => Boolean(registry.resolve('action', a.component))
  const menuable = actions.filter((a) => !custom(a))
  // A menu holding a single action saves no room over its button.
  const overflow = inline != null && menuable.length - inline > 1 ? menuable.slice(inline) : []
  const buttons = actions.filter((a) => !overflow.includes(a))
  return (
    <>
      {buttons.map((a) => (
        <ActionButton
          key={a.name}
          cap={a}
          record={record}
          run={run}
          t={t}
          model={model}
          compact={compact}
          variant={variant}
          size={size}
          className={className}
        />
      ))}
      {overflow.length > 0 && (
        <ActionMenu
          actions={overflow}
          record={record}
          run={run}
          t={t}
          compact={compact}
          variant={variant}
          className={className}
        />
      )}
    </>
  )
}

/**
 * The bulk actions offered on a selection: no `download`, which saves what one call answers and
 * on a selection would save one file per row (a collection action exports the filtered rows).
 */
export function bulkActionsOf(model: ResourceModel): CapabilitySpec[] {
  return actionsByTarget(model.actions, 'bulk').filter((a) => !a.download)
}

/**
 * Labeled buttons for bulk-target actions (selection bar). Each runs on the selected rows it can
 * run on, counted on the button, and is absent when it can run on none; `onDone` follows a run.
 */
export function BulkActions({
  model,
  records,
  t,
  onDone
}: {
  model: ResourceModel
  records: Rec[]
  t: TFunc
  onDone: () => void
}) {
  const { runMany } = useCapabilityRunner(model.spec.name)
  return (
    <>
      {bulkActionsOf(model).map((a) => {
        const rows = records.filter((r) => canRunOn(a, r))
        if (!rows.length) return null
        const runOnRows: RunFn = async (cap, _record, label, body) => {
          await runMany(cap, rows, label, body)
          onDone()
        }
        return <ActionButton key={a.name} cap={a} records={rows} run={runOnRows} t={t} model={model} size="sm" />
      })}
    </>
  )
}

/** Labeled buttons for collection-target actions (list header). */
export function CollectionActions({ model, t, filters }: { model: ResourceModel; t: TFunc; filters?: CrudFilters }) {
  const { run } = useCapabilityRunner(model.spec.name)
  const actions = actionsByTarget(model.actions, 'collection').filter((a) => fillsPath(a.path))
  if (!actions.length) return null
  return (
    <>
      {actions.map((a) => (
        <ActionButton key={a.name} cap={a} run={run} t={t} model={model} filters={filters} />
      ))}
    </>
  )
}
