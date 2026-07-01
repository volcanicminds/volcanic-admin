/**
 * Generated create/edit form. Builds sections from the resource model's
 * `formSections` and submits only the fields the form actually manages (so the
 * payload matches the body schema, not the whole fetched record).
 */
import { useState } from 'react'
import { useForm } from '@refinedev/react-hook-form'
import { useBack } from '@refinedev/core'
import { X, Save, AlertCircle } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { useT } from '@/engine'
import type { ResourceModel, ResolvedField } from '@/engine'
import { FieldInput, formFieldName } from '@/ui/widgets/inputs'

interface AutoFormProps {
  model: ResourceModel
  action: 'create' | 'edit'
  /** Explicit record id (singletons pass a fixed id; otherwise inferred from route). */
  id?: string
  /** Singleton edits target a fixed path with no :id. */
  redirect?: 'list' | 'show' | false
  title: string
}

function defaultsFor(fields: ResolvedField[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of fields) {
    if (f.default !== undefined) out[formFieldName(f)] = f.default
    else if (f.type === 'boolean') out[formFieldName(f)] = false
  }
  return out
}

/** A field shows in the current form mode unless restricted via `form.visibleOn`. */
function visibleForAction(field: ResolvedField, action: 'create' | 'edit'): boolean {
  return !field.form?.visibleOn || field.form.visibleOn === action
}

export function AutoForm({ model, action, id, redirect = 'list', title }: AutoFormProps) {
  const t = useT()
  const back = useBack()
  const [serverError, setServerError] = useState<string | null>(null)
  const sections = model.formSections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => visibleForAction(f, action)) }))
    .filter((s) => s.fields.length > 0)
  const editableFields = sections.flatMap((s) => s.fields)

  const {
    refineCore: { onFinish, formLoading },
    handleSubmit,
    control
  } = useForm({
    refineCoreProps: {
      resource: model.spec.name,
      action,
      id,
      redirect,
      // Singletons fetch/update on the base path (no :id) — see data provider.
      meta: model.spec.singleton ? { singleton: true } : undefined
    },
    defaultValues: action === 'create' ? defaultsFor(editableFields) : undefined
  })

  // Valid submit: build the payload and save. On a server error, refine already
  // stays on the form (the data provider throws → no redirect); we surface the
  // message in a banner and scroll it into view so the work is never lost.
  const onValid = async (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {}
    for (const f of editableFields) {
      if (f.readOnly) continue
      // Image/file fields with their own endpoints are managed out-of-band (the
      // upload widget hits dedicated routes), so they never go in the body.
      if ((f.type === 'image' || f.type === 'file') && f.image?.endpoints?.upload) continue
      const key = formFieldName(f)
      if (key in values) payload[key] = values[key]
    }
    setServerError(null)
    try {
      await onFinish(payload)
    } catch (e) {
      setServerError((e as { message?: string })?.message || t('form.saveError'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Invalid submit: fields are highlighted by their Controllers; bring the first
  // error into view so the user sees what to fix instead of a silent no-op.
  const onInvalid = () => {
    setServerError(null)
    setTimeout(() => {
      document
        .querySelector('form p.text-destructive')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 0)
  }

  const submit = handleSubmit(onValid, onInvalid)

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex gap-2">
          {/* Cancel: discards the in-progress edit and returns where we came from.
              The read-only show view keeps the ArrowLeft "back" affordance instead. */}
          <Button type="button" variant="outline" disabled={formLoading} onClick={() => back()}>
            <X /> {t('action.cancel')}
          </Button>
          <Button type="submit" disabled={formLoading}>
            <Save /> {formLoading ? '…' : t('action.save')}
          </Button>
        </div>
      </div>

      {serverError && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {sections.map((section) => (
        <Card key={section.group}>
          {section.group !== 'default' && (
            <CardHeader>
              <CardTitle className="text-base">{t(`group.${section.group}`)}</CardTitle>
            </CardHeader>
          )}
          <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-2">
            {section.fields.map((field) => (
              <div
                key={field.name}
                className={field.form?.colSpan === 2 ? 'md:col-span-2' : undefined}
              >
                <Label className="mb-1.5 block">
                  {t(field.label ?? `field.${model.spec.name}.${field.name}`)}
                  {(field.required || field.validation?.required) && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </Label>
                <FieldInput field={field} control={control} t={t} />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </form>
  )
}
