/**
 * Default widget set — one input per field type. Selection order:
 *   1. override registry ('widget', field.form.widget)
 *   2. built-in widget for field.form.widget
 *   3. built-in widget for field.type
 * Each widget is a controlled component (value + onChange).
 */
import { Controller, type Control } from 'react-hook-form'
import { Input } from '@/ui/components/ui/input'
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
  const type =
    field.form?.widget === 'password'
      ? 'password'
      : field.type === 'email'
        ? 'email'
        : field.type === 'url'
          ? 'url'
          : 'text'
  return (
    <Input
      type={type}
      value={value ?? ''}
      disabled={disabled}
      placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

function NumberWidget({ field, value, onChange, disabled, t }: WidgetProps) {
  const step = field.validation?.step
  return (
    <Input
      type="number"
      step={step}
      value={value ?? ''}
      disabled={disabled}
      placeholder={field.form?.placeholder ? t(field.form.placeholder) : undefined}
      onChange={(e) => {
        const v = e.target.value
        onChange(v === '' ? null : field.type === 'integer' ? parseInt(v, 10) : parseFloat(v))
      }}
    />
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

function pickWidget(field: ResolvedField): (props: WidgetProps) => JSX.Element {
  if (field.type === 'relation') return ReferenceSelect
  switch (field.type) {
    case 'text':
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
  if (field.required || v.required) rules.required = 'required'
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
        const Widget = custom ?? pickWidget(field)
        return (
          <div className="space-y-1">
            <Widget
              field={field}
              value={rhf.value}
              onChange={rhf.onChange}
              disabled={disabled}
              t={t}
            />
            {field.help && <p className="text-xs text-muted-foreground">{t(field.help)}</p>}
            {fieldState.error && (
              <p className="text-xs text-destructive">{String(fieldState.error.message)}</p>
            )}
          </div>
        )
      }}
    />
  )
}
