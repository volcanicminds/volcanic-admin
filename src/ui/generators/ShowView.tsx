/**
 * Generated detail (show) view. Renders the record as grouped read-only fields,
 * reusing the form sections for layout coherence with edit.
 */
import { useState, type ReactNode } from 'react'
import { useOne, useNavigation, useDelete } from '@refinedev/core'
import { useParams, useNavigate } from 'react-router'
import { Pencil, ArrowLeft, Trash2, CopyPlus } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import { ConfirmDialog } from '@/ui/components/ConfirmDialog'
import { useT } from '@/engine'
import type { ResolvedField, ResourceModel } from '@/engine'
import { cn } from '@/lib/utils'
import { CopyButton, FieldValue, isEmptyValue } from '@/ui/widgets/display'
import { formFieldName } from '@/ui/widgets/inputs'
import { RowActions } from '@/ui/actions/ActionButtons'
import { CLONE_STATE_KEY } from './cloneSeed'
import { detailColumns, detailGridClass, fieldSpanClass, PAGE_BAR } from './layout'
import { useRecordDocumentTitle, resolveFields } from './documentTitle'

/** Writable form values to carry into a pre-filled create form. Mirrors the
 * AutoForm payload rules: skip read-only fields and image/file fields handled
 * out-of-band (their binaries can't be cloned by copying values). Relations map
 * to their foreign key via formFieldName. Finally `spec.cloneReset` forces any
 * per-resource values (e.g. status → draft) over the copied ones. */
function buildCloneSeed(model: ResourceModel, record: Record<string, any>): Record<string, unknown> {
  const seed: Record<string, unknown> = {}
  for (const section of model.formSections) {
    for (const field of section.fields) {
      if (field.readOnly) continue
      if ((field.type === 'image' || field.type === 'file') && field.image?.endpoints?.upload) continue
      const key = formFieldName(field)
      if (record[key] !== undefined) seed[key] = record[key]
    }
  }
  return { ...seed, ...(model.spec.cloneReset ?? {}) }
}

type Translate = (key?: string, vars?: Record<string, string | number>) => string

/** Fields the meta strip draws when the record has them, so the sections skip them. */
const META_FIELDS = new Set(['id', 'createdAt', 'updatedAt'])

/**
 * Values that need the room of their cell, so their label sits above them, not beside: prose,
 * images, and a filled JSON map, drawn one `key: value` per line (a JSON list reads as one line).
 */
function stacked(field: ResolvedField, value: unknown): boolean {
  if (field.type === 'json') {
    return value != null && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length > 0
  }
  return ['text', 'richtext', 'image', 'file'].includes(field.type)
}

/** Compact meta strip for the read-only system fields (id + timestamps). The id
 * carries a copy-to-clipboard button; created/updated are shown when present;
 * `extra` closes the strip on its right. */
function RecordMeta({ record, t, extra }: { record: Record<string, any>; t: Translate; extra?: ReactNode }) {
  const id = record.id
  const created = record.createdAt
  const updated = record.updatedAt
  if (id == null && created == null && updated == null && !extra) return null

  const fmt = (v: unknown) => {
    const d = new Date(v as string)
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString()
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {id != null && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{t('meta.id')}</span>
          <code className="font-mono text-[11px]">{String(id)}</code>
          <CopyButton value={String(id)} t={t} />
        </div>
      )}
      {created != null && (
        <div>
          <span className="font-medium">{t('meta.createdAt')}</span> {fmt(created)}
        </div>
      )}
      {updated != null && (
        <div>
          <span className="font-medium">{t('meta.updatedAt')}</span> {fmt(updated)}
        </div>
      )}
      {extra && <div className="ml-auto">{extra}</div>}
    </div>
  )
}

export function ShowView({ model }: { model: ResourceModel }) {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const { spec } = model
  const { list, edit } = useNavigation()
  const { mutate: deleteOne } = useDelete()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showEmpty, setShowEmpty] = useState(false)

  const { data, isLoading } = useOne({ resource: spec.name, id })
  const record = data?.data

  // Browser tab title: "<singular label> <record title>", e.g. "Veicolo BMW 320".
  useRecordDocumentTitle(model, record)

  const canDelete = model.canDeleteAt('row')
  const canClone = model.hasAction('create') && spec.clonable !== false

  // Clone: open the create form pre-seeded with this record's writable values
  // (carried in router state). The user reviews and saves, so unique fields like
  // the name are corrected before insert rather than failing on a blind copy.
  const clone = () => {
    if (!record) return
    // Absolute path (leading slash) so it resolves from the router root, not the
    // current /show/:id location; react-router applies any basename.
    const base = `/${spec.path.replace(/^\/+/, '')}`
    navigate(`${base}/create`, { state: { [CLONE_STATE_KEY]: buildCloneSeed(model, record) } })
  }

  // A write-only field has no value to read back, and a meta field already sits in the strip.
  const shown = (field: ResolvedField) =>
    !field.writeOnly && !(META_FIELDS.has(field.name) && record?.[field.name] != null)
  const sections = (
    model.formSections.length > 0 ? model.formSections : [{ group: 'default', fields: model.fields }]
  ).map((section) => ({ ...section, fields: section.fields.filter(shown) }))
  const emptyCount = record
    ? sections.reduce((n, s) => n + s.fields.filter((f) => isEmptyValue(record, f)).length, 0)
    : 0

  // Relation-aware: a relation in titleField resolves to its titleField (e.g.
  // brand → "BMW"), never "[object Object]" or the raw foreign key.
  const title =
    (record && resolveFields(model, record, spec.titleField ?? 'name')) || t(spec.label.singular)

  return (
    <div className="space-y-6">
      {/* Title + actions stay pinned while the record scrolls. */}
      <div className={`${PAGE_BAR.top} flex items-center justify-between gap-4`}>
        <h1 className="text-2xl font-semibold">{isLoading ? '…' : title}</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => list(spec.name)}>
            <ArrowLeft /> {t('action.back')}
          </Button>
          {record && <RowActions model={model} record={record} t={t} compact={false} inline={3} />}
          {canClone && (
            <Button variant="outline" onClick={clone}>
              <CopyPlus /> {t('action.clone')}
            </Button>
          )}
          {model.hasAction('update') && (
            <Button onClick={() => id && edit(spec.name, id)}>
              <Pencil /> {t('action.edit')}
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2 /> {t('action.delete')}
            </Button>
          )}
        </div>
      </div>

      {record && (
        <RecordMeta
          record={record}
          t={t}
          extra={
            emptyCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                aria-pressed={showEmpty}
                onClick={() => setShowEmpty((v) => !v)}
              >
                {showEmpty ? t('detail.hideEmpty') : t('detail.showEmpty', { count: emptyCount })}
              </Button>
            )
          }
        />
      )}

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('action.delete.confirmTitle')}
        description={t('action.delete.confirmText')}
        confirmLabel={t('action.delete')}
        cancelLabel={t('action.cancel')}
        destructive
        onConfirm={() => {
          if (id) deleteOne({ resource: spec.name, id }, { onSuccess: () => list(spec.name) })
          setConfirmDelete(false)
        }}
      />

      {record &&
        sections.map((section) => {
          const cols = detailColumns(section.columns ?? model.formColumns)
          const fields = showEmpty ? section.fields : section.fields.filter((f) => !isEmptyValue(record, f))
          if (!fields.length) return null
          return (
            <Card key={section.group}>
              {section.group !== 'default' && (
                <CardHeader>
                  <CardTitle className="text-base">{t(section.label ?? `group.${section.group}`)}</CardTitle>
                </CardHeader>
              )}
              <CardContent className="pt-6">
                <dl className={detailGridClass(cols)}>
                  {fields.map((field) => (
                    <div
                      key={field.name}
                      className={cn(
                        stacked(field, record[field.name])
                          ? 'space-y-1'
                          : 'grid grid-cols-[minmax(0,min(10rem,40%))_minmax(0,1fr)] items-baseline gap-x-3',
                        fieldSpanClass(field, cols)
                      )}
                    >
                      <dt className="text-sm text-muted-foreground">
                        {t(field.label ?? `field.${spec.name}.${field.name}`)}
                      </dt>
                      <dd className="min-w-0 break-words text-sm">
                        <FieldValue record={record} field={field} t={t} />
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          )
        })}
    </div>
  )
}
