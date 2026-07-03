/**
 * Generated detail (show) view. Renders the record as grouped read-only fields,
 * reusing the form sections for layout coherence with edit.
 */
import { useState } from 'react'
import { useOne, useNavigation, useDelete } from '@refinedev/core'
import { useParams, useNavigate } from 'react-router'
import { Pencil, ArrowLeft, Trash2, Copy, Check, CopyPlus } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/ui/components/ui/dialog'
import { useT } from '@/engine'
import type { ResourceModel } from '@/engine'
import { FieldValue } from '@/ui/widgets/display'
import { formFieldName } from '@/ui/widgets/inputs'
import { RowActions } from '@/ui/actions/ActionButtons'
import { CLONE_STATE_KEY } from './cloneSeed'
import { detailColumns, sectionGridClass, fieldSpanClass } from './layout'

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

/** Compact meta strip for the read-only system fields (id + timestamps). The id
 * carries a copy-to-clipboard button; created/updated are shown when present. */
function RecordMeta({ record, t }: { record: Record<string, any>; t: Translate }) {
  const [copied, setCopied] = useState(false)
  const id = record.id
  const created = record.createdAt
  const updated = record.updatedAt
  if (id == null && created == null && updated == null) return null

  const fmt = (v: unknown) => {
    const d = new Date(v as string)
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString()
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(id))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      {id != null && (
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{t('meta.id')}</span>
          <code className="font-mono text-[11px]">{String(id)}</code>
          <button
            type="button"
            onClick={copy}
            title={t('action.copy')}
            aria-label={t('action.copy')}
            className="inline-flex transition-colors hover:text-foreground"
          >
            {copied ? <Check className="size-3.5 text-green-600" /> : <Copy className="size-3.5" />}
          </button>
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

  const { data, isLoading } = useOne({ resource: spec.name, id })
  const record = data?.data

  const canDelete = model.hasAction('delete')
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

  const sections =
    model.formSections.length > 0
      ? model.formSections
      : [{ group: 'default', fields: model.fields }]

  const titleParts = Array.isArray(spec.titleField)
    ? spec.titleField
    : [spec.titleField ?? 'name']
  const title =
    (record &&
      titleParts
        .map((f) => record[f])
        .filter((v) => v != null && v !== '')
        .join(' ')) ||
    t(spec.label.singular)

  return (
    <div className="space-y-6">
      {/* Title + actions stay pinned while the record scrolls. `-mx-6 px-6` spans
          the main content padding so it reads as a full-width toolbar. `-top-6`
          cancels the main's top padding so it sticks flush under the app topbar
          (main is the scroll container). */}
      <div className="sticky -top-6 z-20 -mx-6 flex items-center justify-between gap-4 border-b bg-background px-6 py-4">
        <h1 className="text-2xl font-semibold">{isLoading ? '…' : title}</h1>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => list(spec.name)}>
            <ArrowLeft /> {t('action.back')}
          </Button>
          {record && <RowActions model={model} record={record} t={t} compact={false} />}
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

      {record && <RecordMeta record={record} t={t} />}

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('action.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>{t('action.delete.confirmText')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (id)
                  deleteOne(
                    { resource: spec.name, id },
                    { onSuccess: () => list(spec.name) }
                  )
                setConfirmDelete(false)
              }}
            >
              {t('action.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {record &&
        sections.map((section) => {
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
                <div
                  key={field.name}
                  className={['space-y-1', fieldSpanClass(field, cols)].filter(Boolean).join(' ')}
                >
                  <div className="text-xs font-medium text-muted-foreground">
                    {t(field.label ?? `field.${spec.name}.${field.name}`)}
                  </div>
                  <div className="text-sm">
                    <FieldValue record={record} field={field} t={t} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          )
        })}
    </div>
  )
}
