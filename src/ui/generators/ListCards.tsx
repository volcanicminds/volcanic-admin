/**
 * Card presentation for the generated list. Card content is derived from the
 * manifest metadata (no extra config): cover image (a mini carousel when the
 * record has multiple images), title/subtitle fields, enum badges, and a
 * primary numeric field. The image block is omitted for resources with no
 * image field.
 */
import { useState } from 'react'
import { Pencil, Trash2, ImageOff, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/ui/components/ui/button'
import { Card } from '@/ui/components/ui/card'
import { FieldCell } from '@/ui/widgets/display'
import type { ListPresentationProps } from './listShared'
import { RowActions } from '../actions/ActionButtons'

/** Resolve a display string from one or more fields (joined with spaces). */
function display(record: any, field?: string | string[]): string {
  if (!field) return ''
  return (Array.isArray(field) ? field : [field])
    .map((f) => record[f])
    .filter((v) => v != null && v !== '')
    .join(' ')
}

/** All displayable image URLs for a record, cover first. */
function imageUrls(record: any, imageFieldName?: string): string[] {
  const v = imageFieldName ? record[imageFieldName] : undefined
  if (Array.isArray(v) && v.length) {
    return v.map((it) => it?.url ?? it).filter(Boolean)
  }
  if (record.coverUrl) return [record.coverUrl]
  if (typeof v === 'string' && v) return [v]
  return []
}

function CardCarousel({ urls }: { urls: string[] }) {
  const [i, setI] = useState(0)
  const multi = urls.length > 1
  const go = (e: React.MouseEvent, dir: number) => {
    e.stopPropagation()
    setI((p) => (p + dir + urls.length) % urls.length)
  }
  const index = Math.min(i, Math.max(0, urls.length - 1))

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden bg-muted/40">
      {urls.length ? (
        <img src={urls[index]} alt="" className="h-full w-full object-cover" />
      ) : (
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
      )}
      {multi && (
        <>
          <button
            type="button"
            onClick={(e) => go(e, -1)}
            className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={(e) => go(e, 1)}
            className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-background/70 p-1 opacity-0 transition-opacity hover:bg-background group-hover:opacity-100"
            aria-label="Next image"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            {urls.map((_, d) => (
              <span
                key={d}
                className={cn(
                  'h-1.5 w-1.5 rounded-full transition-colors',
                  d === index ? 'bg-white' : 'bg-white/50'
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function ListCards({
  model,
  records,
  isLoading,
  t,
  canEdit,
  canDelete,
  onShow,
  onEdit,
  onDelete
}: ListPresentationProps) {
  const { spec, listFields } = model

  const imageField = model.fields.find((f) => f.type === 'image')
  const hasImage = Boolean(imageField)
  const titleField = spec.titleField ?? 'name'
  const subtitleField = spec.subtitleField
  const badgeFields = listFields.filter((f) => f.type === 'enum')
  const numberField = listFields.find((f) => f.type === 'number' || f.type === 'integer')
  const cardFields = (spec.cardFields ?? []).map((n) => model.field(n)).filter(Boolean) as NonNullable<
    ReturnType<typeof model.field>
  >[]

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.loading')}</div>
  }
  if (records.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.empty')}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record: any) => {
        const urls = hasImage ? imageUrls(record, imageField?.name) : []
        const hasRowActions = model.actions.some((a) => !a.target || a.target.includes('row'))
        const actions = (canEdit || canDelete || hasRowActions) && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <RowActions model={model} record={record} t={t} />
            {canEdit && (
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onEdit(record.id)}>
                <Pencil />
              </Button>
            )}
            {canDelete && (
              <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => onDelete(record.id)}>
                <Trash2 className="text-destructive" />
              </Button>
            )}
          </div>
        )
        return (
          <Card
            key={record.id}
            className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
            onClick={() => onShow(record.id)}
          >
            {hasImage && (
              <div className="relative">
                <CardCarousel urls={urls} />
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {actions}
                </div>
              </div>
            )}
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{display(record, titleField) || '—'}</div>
                  {display(record, subtitleField) && (
                    <div className="truncate text-sm text-muted-foreground">
                      {display(record, subtitleField)}
                    </div>
                  )}
                </div>
                {!hasImage && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">{actions}</div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1">
                {badgeFields.map((f) => (
                  <FieldCell key={f.name} record={record} field={f} t={t} />
                ))}
              </div>
              {numberField && record[numberField.name] != null && (
                <div className="text-sm font-semibold">
                  <FieldCell record={record} field={numberField} t={t} />
                </div>
              )}
              {cardFields.length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  {cardFields.map((f) => (
                    <div key={f.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t(f.label ?? `field.${spec.name}.${f.name}`)}
                      </span>
                      <FieldCell record={record} field={f} t={t} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )
      })}
    </div>
  )
}
