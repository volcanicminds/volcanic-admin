/**
 * Generated create/edit form. Builds sections from the resource model's
 * `formSections` and submits only the fields the form actually manages (so the
 * payload matches the body schema, not the whole fetched record).
 */
import { useCallback, useRef, useState } from 'react'
import { useForm } from '@refinedev/react-hook-form'
import { useBack, useApiUrl, useNavigation } from '@refinedev/core'
import { useLocation } from 'react-router'
import { toast } from 'sonner'
import { X, Save, AlertCircle } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Label } from '@/ui/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { UnsavedChangesGuard } from '@/ui/components/UnsavedChangesGuard'
import { useT, interpolatePath } from '@/engine'
import type { ResourceModel, ResolvedField } from '@/engine'
import { FieldInput, formFieldName } from '@/ui/widgets/inputs'
import { uploadFiles, pendingFiles } from '@/ui/widgets/upload/rest'
import { CLONE_STATE_KEY } from './cloneSeed'
import { detailColumns, sectionGridClass, fieldSpanClass } from './layout'
import { useRecordDocumentTitle } from './documentTitle'

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

/**
 * An untouched/cleared select or date input holds `''`, which is a valid value for
 * a text field ('' IS how you clear one) but not for these types: no enum admits
 * '' and no date parses it, so the server rejects the whole save. Send `null` —
 * "no value" — instead. Text/number widgets are untouched (a number widget already
 * emits null when emptied).
 */
function emptyToNull(field: ResolvedField, value: unknown): unknown {
  if (value !== '') return value
  return field.type === 'enum' || field.type === 'date' || field.type === 'datetime' ? null : value
}

export function AutoForm({ model, action, id, redirect = 'list', title }: AutoFormProps) {
  const t = useT()
  const back = useBack()
  const apiUrl = useApiUrl()
  const { list, show, edit } = useNavigation()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)
  // Bridges the created record from refine's mutation callbacks to onValid.
  // onFinish resolves before onMutationSuccess fires and (in this refine version)
  // returns undefined, so onValid awaits this instead — resolved with the record
  // on success, or null on error. Set per-submit right before onFinish.
  const createdResolverRef = useRef<((rec: Record<string, unknown> | null) => void) | null>(null)
  const sections = model.formSections
    .map((s) => ({ ...s, fields: s.fields.filter((f) => visibleForAction(f, action)) }))
    .filter((s) => s.fields.length > 0)
  const editableFields = sections.flatMap((s) => s.fields)

  // A "Clone" navigation from the show view carries the source record's writable
  // values in router state; on create we layer them over the field defaults.
  const cloneSeed =
    action === 'create'
      ? (location.state as Record<string, unknown> | null)?.[CLONE_STATE_KEY]
      : undefined

  const {
    refineCore: { onFinish, formLoading, query },
    handleSubmit,
    control,
    reset,
    formState
  } = useForm({
    refineCoreProps: {
      resource: model.spec.name,
      action,
      id,
      // We navigate manually after a successful save (create uploads staged images
      // first; both modes must disarm the unsaved-changes guard before leaving), so
      // refine's own redirect is disabled and driven from onValid instead.
      redirect: false,
      // Hand the created record (or null on failure) to onValid so it can upload
      // staged images. The payload shape varies by refine version: sometimes
      // `{ data: record }`, sometimes the record directly — accept either.
      onMutationSuccess: (data) => {
        const raw = data as { data?: Record<string, unknown> } | Record<string, unknown>
        const rec = (raw as { data?: Record<string, unknown> })?.data ?? raw
        createdResolverRef.current?.(rec && typeof rec === 'object' ? (rec as Record<string, unknown>) : null)
      },
      onMutationError: () => createdResolverRef.current?.(null),
      // Singletons fetch/update on the base path (no :id) — see data provider.
      meta: model.spec.singleton ? { singleton: true } : undefined
    },
    defaultValues:
      action === 'create'
        ? { ...defaultsFor(editableFields), ...((cloneSeed as Record<string, unknown>) ?? {}) }
        : undefined
  })

  // Browser tab title on edit: "<singular label> <record title>" once the record
  // loads. Create keeps the route-level handler's "New <label>" title (no record).
  useRecordDocumentTitle(model, query?.data?.data, action === 'edit')

  // Image/file fields that upload out-of-band to their own endpoints: excluded
  // from the body, and (on create) the source of files staged in the widget.
  const uploadFields = editableFields.filter(
    (f) => (f.type === 'image' || f.type === 'file') && f.image?.endpoints?.upload
  )

  // Unsaved-changes guard: warn before leaving a dirty form. Only in-app link
  // clicks and hard navigation are intercepted (see UnsavedChangesGuard); the
  // programmatic redirects below and the Cancel button navigate freely.
  const isDirty = formState.isDirty
  const shouldBlock = useCallback(() => isDirty, [isDirty])

  // Post-save navigation, honouring the configured redirect. With no redirect
  // target (singletons) it marks the form pristine so the guard disarms and stays.
  const navigateAfterSave = (savedId: unknown, values: Record<string, unknown>) => {
    if (redirect === 'show' && savedId != null) show(model.spec.name, String(savedId))
    else if (redirect === 'list') list(model.spec.name)
    else reset(values)
  }

  // Valid submit: build the payload and save. On failure the mutation resolves
  // without a record (or the promise throws) and refine surfaces the error; either
  // way we stay on the form (guard still armed) so the work is never lost.
  const onValid = async (values: Record<string, unknown>) => {
    const payload: Record<string, unknown> = {}
    for (const f of editableFields) {
      if (f.readOnly) continue
      // Image/file fields with their own endpoints are managed out-of-band (the
      // upload widget hits dedicated routes), so they never go in the body.
      if ((f.type === 'image' || f.type === 'file') && f.image?.endpoints?.upload) continue
      const key = formFieldName(f)
      if (key in values) payload[key] = emptyToNull(f, values[key])
    }
    setServerError(null)
    // Arm the bridge before submitting; a mutation callback resolves it.
    let resolveSaved!: (rec: Record<string, unknown> | null) => void
    const savedPromise = new Promise<Record<string, unknown> | null>((res) => {
      resolveSaved = res
      // Safety net: if neither mutation callback fires, don't hang the flow.
      setTimeout(() => res(null), 8000)
    })
    createdResolverRef.current = resolveSaved
    try {
      await onFinish(payload)
      // onFinish resolves before the mutation callbacks fire, so wait for the saved
      // record they hand back (null on error → stay put, refine showed the error).
      const saved = await savedPromise
      if (!saved) return
      const savedId = saved.id ?? id

      // On create the upload widgets staged their files (no id existed yet); now the
      // record exists, upload them, then land on the detail view to confirm.
      if (action === 'create') {
        const staged = uploadFields
          .map((f) => ({ f, files: pendingFiles(values[formFieldName(f)]) }))
          .filter((u) => u.files.length > 0)
        if (staged.length > 0 && savedId != null) {
          try {
            for (const u of staged) {
              await uploadFiles(apiUrl, interpolatePath(u.f.image!.endpoints!.upload!.path, { id: savedId }), u.files)
            }
          } catch {
            // Record created but some images failed: go to its edit view so the user
            // can retry the upload instead of re-submitting create (which duplicates).
            toast.error(t('upload.partialFail'))
            edit(model.spec.name, String(savedId))
            return
          }
          // Everything saved — show the record (its images are visible there).
          show(model.spec.name, String(savedId))
          return
        }
      }

      navigateAfterSave(savedId, values)
    } catch (e) {
      setServerError((e as { message?: string })?.message || t('form.saveError'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      createdResolverRef.current = null
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
      {/* In-app navigation while the form is dirty gets a styled confirm modal
          instead of the browser's native prompt. */}
      <UnsavedChangesGuard shouldBlock={shouldBlock} />

      {/* Title + Cancel/Save pinned while the form scrolls (flush under the app
          topbar); mirrors the show view. `-mx-6 px-6` = full-width toolbar,
          `-top-6` cancels the main's top padding. */}
      <div className="sticky -top-6 z-20 -mx-6 flex items-center justify-between gap-4 border-b bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold">{title}</h1>
        <div className="flex flex-wrap justify-end gap-2">
          {/* Cancel: discards the in-progress edit and returns where we came from.
              It navigates programmatically, so the unsaved-changes guard (which only
              intercepts link clicks) lets it through. */}
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

      {sections.map((section) => {
        const cols = detailColumns(section.columns ?? model.formColumns)
        return (
        <Card key={section.group}>
          {section.group !== 'default' && (
            <CardHeader>
              <CardTitle className="text-base">{t(section.label ?? `group.${section.group}`)}</CardTitle>
            </CardHeader>
          )}
          <CardContent className={`${sectionGridClass(cols)} pt-6`}>
            {section.fields.map((field) => (
              <div key={field.name} className={fieldSpanClass(field, cols)}>

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
        )
      })}
    </form>
  )
}
