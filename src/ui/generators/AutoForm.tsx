/**
 * Generated create/edit form. Builds sections from the resource model's
 * `formSections` and submits only the fields the form actually manages (so the
 * payload matches the body schema, not the whole fetched record).
 */
import { useForm } from '@refinedev/react-hook-form'
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

export function AutoForm({ model, action, id, redirect = 'list', title }: AutoFormProps) {
  const t = useT()
  const editableFields = model.formSections.flatMap((s) => s.fields)

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

  const submit = handleSubmit((values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {}
    for (const f of editableFields) {
      if (f.readOnly) continue
      const key = formFieldName(f)
      if (key in values) payload[key] = values[key]
    }
    return onFinish(payload)
  })

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <Button type="submit" disabled={formLoading}>
          {formLoading ? '…' : t('action.save')}
        </Button>
      </div>

      {model.formSections.map((section) => (
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
