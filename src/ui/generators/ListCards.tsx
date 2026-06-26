/**
 * Card presentation for the generated list. Card content is derived from the
 * manifest metadata (no extra config): cover image, title/subtitle fields,
 * enum badges, and a primary numeric field.
 */
import { Pencil, Trash2, ImageOff } from 'lucide-react'
import { Button } from '@/ui/components/ui/button'
import { Card } from '@/ui/components/ui/card'
import { FieldCell } from '@/ui/widgets/display'
import type { ListPresentationProps } from './listShared'

function coverOf(record: any, imageFieldName?: string): string | undefined {
  if (record.coverUrl) return record.coverUrl
  if (!imageFieldName) return undefined
  const v = record[imageFieldName]
  if (Array.isArray(v)) return v[0]?.url
  return typeof v === 'string' ? v : undefined
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

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.loading')}</div>
  }
  if (records.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.empty')}</div>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {records.map((record: any) => {
        const cover = hasImage ? coverOf(record, imageField?.name) : undefined
        const actions = (canEdit || canDelete) && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
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
              <div className="relative flex aspect-video items-center justify-center bg-muted/40">
                {cover ? (
                  <img src={cover} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageOff className="h-8 w-8 text-muted-foreground/50" />
                )}
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {actions}
                </div>
              </div>
            )}
            <div className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-medium">{record[titleField] ?? '—'}</div>
                  {subtitleField && record[subtitleField] && (
                    <div className="truncate text-sm text-muted-foreground">{record[subtitleField]}</div>
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
            </div>
          </Card>
        )
      })}
    </div>
  )
}
