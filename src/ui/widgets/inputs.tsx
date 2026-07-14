/**
 * Default widget set — one input per field type. Selection order:
 *   1. override registry ('widget', field.form.widget)
 *   2. built-in widget for field.form.widget
 *   3. built-in widget for field.type
 * Each widget is a controlled component (value + onChange).
 */
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Controller, type Control } from 'react-hook-form'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/ui/components/ui/input'
import { PasswordInput } from '@/ui/components/ui/password-input'
import { Textarea } from '@/ui/components/ui/textarea'
import { Switch } from '@/ui/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/components/ui/select'
import { useRegistry } from '@/engine'
import type { ResolvedField, ValidationSpec } from '@/engine'
import { ReferenceSelect } from './ReferenceSelect'
import type { WidgetProps } from './types'

function TextWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const common = {
    value: value ?? '',
    disabled,
    placeholder: field.form?.placeholder ? t(field.form.placeholder) : undefined,
    onChange: (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)
  }
  if (field.form?.widget === 'password') return <PasswordInput {...common} />
  const type = field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'
  return <Input type={type} {...common} />
}

// Parse an integer from free-form text, preserving an optional leading minus
// sign. A naive `/\D/g` strip drops the '-', so negative values (e.g. an
// ordering `importance` below zero) could never be typed. Keeps the digits
// before any decimal separator; returns null for empty input or a lone '-'
// (an intermediate state while the user is still typing).
function parseIntInput(raw: string): number | null {
  const head = raw.split(/[.,]/)[0].trim()
  const sign = head.startsWith('-') ? '-' : ''
  const digits = head.replace(/\D/g, '')
  return digits === '' ? null : parseInt(sign + digits, 10)
}

// A numeric field rendered as a plain text input (inputMode drives the mobile
// keypad) — NOT `type="number"`. The native number input adds up/down spinners
// that increment on scroll-wheel or a tiny mouse drag inside the field, silently
// corrupting the value; a text input avoids that entirely. A local string mirror
// lets the user type intermediate states (a trailing `.`, an empty field) while
// the parsed number is what flows out via onChange.
function NumberWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const isInt = field.type === 'integer'
  const [text, setText] = useState<string>(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)
  // Resync the visible text to the external value while not editing (e.g. a
  // server-derived price, a form reset, or switching records).
  useEffect(() => {
    if (!focused) setText(value == null ? '' : String(value))
  }, [value, focused])

  const commit = (raw: string) => {
    setText(raw)
    if (raw === '') return onChange(null)
    if (isInt) {
      return onChange(parseIntInput(raw))
    }
    // Float path: parseFloat already keeps a leading '-', so negatives work.
    const n = parseFloat(raw.replace(',', '.'))
    if (!Number.isNaN(n)) onChange(n)
  }

  return (
    <Input
      type="text"
      inputMode={isInt ? 'numeric' : 'decimal'}
      value={text}
      disabled={disabled}
      placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={(e) => commit(e.target.value)}
    />
  )
}

/** Editable select: a free-text input styled like the Select trigger, with a
 *  chevron that drops the predefined `field.form.suggestions` — pick one or type
 *  a custom value. Integer fields accept digits only (no decimal separator). */
function ComboboxWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const suggestions = field.form?.suggestions ?? []
  const isInt = field.type === 'integer'
  const isNum = isInt || field.type === 'number'

  const parse = (raw: string) => {
    if (raw === '') return null
    // Integers only: keep the part before any decimal separator (sign preserved).
    if (isInt) return parseIntInput(raw)
    if (isNum) {
      const n = parseFloat(raw) // parseFloat keeps a leading '-', so negatives work
      return Number.isNaN(n) ? null : n
    }
    return raw
  }

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hasList = suggestions.length > 0

  // Local string mirror so the user can type intermediate states — a leading '-'
  // or an empty field — without the external value snapping the input back. The
  // parsed number is what flows out via onChange; resync to the value while idle.
  const [text, setText] = useState<string>(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    if (!focused) setText(value == null ? '' : String(value))
  }, [value, focused])

  // Close on any click outside the widget (the options panel lives inside `ref`,
  // so picking an option doesn't count as "outside").
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Input
        type="text"
        inputMode={isNum ? 'numeric' : undefined}
        className={hasList ? 'pr-9' : undefined}
        value={text}
        disabled={disabled}
        placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
        onChange={(e) => {
          setText(e.target.value)
          onChange(parse(e.target.value))
        }}
        // Open on focus/click like a select — the field itself is the trigger.
        onFocus={() => {
          setFocused(true)
          if (hasList) setOpen(true)
        }}
        onBlur={() => setFocused(false)}
        onClick={() => hasList && setOpen(true)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
      />
      {hasList && (
        <>
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            aria-label="options"
            className="absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
            onClick={() => setOpen((o) => !o)}
          >
            <ChevronDown className="h-4 w-4 opacity-50" />
          </button>
          {open && (
            <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
              {suggestions.map((s) => (
                <button
                  key={String(s)}
                  type="button"
                  className="block w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                  onClick={() => {
                    setText(String(s))
                    onChange(parse(String(s)))
                    setOpen(false)
                  }}
                >
                  {String(s)}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function TextareaWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  return (
    <Textarea
      value={value ?? ''}
      disabled={disabled}
      placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      onChange={(e) => onChange(e.target.value)}
      rows={field.type === 'richtext' ? 8 : 4}
    />
  )
}

function BooleanWidget({ value, onChange, disabled }: WidgetProps) {
  return (
    <div className="flex h-9 items-center">
      <Switch checked={Boolean(value)} onCheckedChange={onChange} disabled={disabled} />
    </div>
  )
}

/** Multi-select for an array-valued field (e.g. roles). Options come from `field.options`
 *  (so declare the field as `enum` + `form.widget: 'multiselect'`). Value is a string[]. */
function MultiSelectWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const options = field.options ?? []
  const selected: string[] = Array.isArray(value) ? value.map(String) : value ? [String(value)] : []
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={selected.includes(opt.value)}
            disabled={disabled}
            onChange={() => toggle(opt.value)}
          />
          <span>{t(opt.label)}</span>
        </label>
      ))}
    </div>
  )
}

function EnumWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const options = field.options ?? []
  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={onChange}
      disabled={disabled}
    >
      <SelectTrigger>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {t(opt.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function DateWidget({ field, value, onChange, disabled }: WidgetProps) {
  const type = field.type === 'datetime' ? 'datetime-local' : 'date'
  // Normalize ISO → input-local value.
  const v =
    value && typeof value === 'string'
      ? type === 'datetime-local'
        ? value.slice(0, 16)
        : value.slice(0, 10)
      : ''
  return (
    <Input type={type} value={v} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
  )
}

function JsonWidget({ value, onChange, disabled }: WidgetProps) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? null, null, 2)
  return (
    <Textarea
      className="font-mono text-xs"
      rows={8}
      value={text}
      disabled={disabled}
      onChange={(e) => {
        try {
          onChange(JSON.parse(e.target.value))
        } catch {
          onChange(e.target.value)
        }
      }}
    />
  )
}

function ImageWidget({ field }: WidgetProps) {
  return (
    <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      Image/file field <code>{field.name}</code> — handled by a dedicated upload widget
      {field.form?.widget ? ` (override "${field.form.widget}")` : ''}. Register a widget override to
      enable uploads.
    </div>
  )
}

/** Built-in widgets selectable by name via `field.form.widget` (not just by type). */
const BUILTIN_WIDGETS: Record<string, (props: WidgetProps) => JSX.Element> = {
  multiselect: MultiSelectWidget,
  combobox: ComboboxWidget
}

function pickWidget(field: ResolvedField): (props: WidgetProps) => JSX.Element {
  if (field.type === 'relation') return ReferenceSelect
  switch (field.type) {
    case 'text':
    case 'textarea':
      return TextareaWidget
    // richtext defaults to the registered rich-text editor (resolved in FieldInput);
    // this is the fallback if that widget isn't registered.
    case 'richtext':
      return TextareaWidget
    case 'integer':
    case 'number':
      return NumberWidget
    case 'boolean':
      return BooleanWidget
    case 'enum':
      return EnumWidget
    case 'date':
    case 'datetime':
      return DateWidget
    case 'json':
      return JsonWidget
    case 'image':
    case 'file':
      return ImageWidget
    default:
      return TextWidget
  }
}

function toRules(field: ResolvedField) {
  const v: ValidationSpec = field.validation ?? {}
  const rules: Record<string, unknown> = {}
  if (field.required || v.required) rules.required = 'validation.required'
  if (v.min != null) rules.min = { value: v.min, message: `≥ ${v.min}` }
  if (v.max != null) rules.max = { value: v.max, message: `≤ ${v.max}` }
  if (v.minLength != null) rules.minLength = { value: v.minLength, message: `min ${v.minLength}` }
  if (v.maxLength != null) rules.maxLength = { value: v.maxLength, message: `max ${v.maxLength}` }
  if (v.pattern) rules.pattern = { value: new RegExp(v.pattern), message: 'invalid format' }
  return rules
}

export interface FieldInputProps {
  field: ResolvedField
  control: Control
  t: WidgetProps['t']
}

/** The form binds relations to their foreign key (e.g. brandId), not the relation name. */
export function formFieldName(field: ResolvedField): string {
  if (field.type === 'relation' && field.relation?.foreignKey) return field.relation.foreignKey
  return field.name
}

export function FieldInput({ field, control, t }: FieldInputProps) {
  const registry = useRegistry()
  const disabled = Boolean(field.readOnly)

  return (
    <Controller
      name={formFieldName(field)}
      control={control}
      rules={toRules(field)}
      defaultValue={(field.default as any) ?? (field.type === 'boolean' ? false : '')}
      render={({ field: rhf, fieldState }) => {
        const custom = registry.resolve('widget', field.form?.widget)
        const builtin = field.form?.widget ? BUILTIN_WIDGETS[field.form.widget] : undefined
        // A richtext field with no explicit widget defaults to the registered
        // rich-text editor (shipped lazily by the engine); falls back to textarea.
        const typeDefault =
          !field.form?.widget && field.type === 'richtext'
            ? registry.resolve('widget', 'rich-text')
            : undefined
        const Widget = custom ?? builtin ?? typeDefault ?? pickWidget(field)
        // On error, outline the actual control (input/textarea/select trigger) so
        // the invalid field is visually obvious, not just the helper text below.
        return (
          <div
            className={cn(
              'space-y-1',
              fieldState.error &&
                '[&_[role=combobox]]:border-destructive [&_input]:border-destructive [&_textarea]:border-destructive'
            )}
          >
            <Widget
              field={field}
              value={rhf.value}
              onChange={rhf.onChange}
              disabled={disabled}
              t={t}
            />
            {field.help && <p className="text-xs text-muted-foreground">{t(field.help)}</p>}
            {fieldState.error && (
              <p className="text-xs text-destructive">{t(String(fieldState.error.message))}</p>
            )}
          </div>
        )
      }}
    />
  )
}
