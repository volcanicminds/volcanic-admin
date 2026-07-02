/**
 * Card presentation for the generated list. Content is driven by the resolved
 * `card` model (from the resource `list.card` view block): cover image (a mini
 * carousel when the record has multiple images), title/subtitle, enum badges, and
 * the ordered `body` info rows. The image block is omitted when no image slot.
 */
import { useState } from 'react'
import { useApiUrl } from '@refinedev/core'
import { Pencil, Trash2, ImageOff, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { cn, absoluteUrl } from '@/lib/utils'
import { Button } from '@/ui/components/ui/button'
import { Card } from '@/ui/components/ui/card'
import { FieldCell } from '@/ui/widgets/display'
import type { ListPresentationProps } from './listShared'
import { RowActions } from '../actions/ActionButtons'

// Literal class strings (kept whole so Tailwind includes them in the built CSS).
const GRID_BY_COLS: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
  6: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
}

/** "Featured" pill (amber) shown on highlighted cards. */
function FeaturedBadge({ t }: { t: (k?: string, v?: Record<string, string | number>) => string }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-medium text-amber-950 shadow-sm">
      <Star className="size-3 fill-current" />
      {t('badge.featured')}
    </div>
  )
}

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

function CardCarousel({ urls, fit = 'cover' }: { urls: string[]; fit?: 'cover' | 'contain' }) {
  const [i, setI] = useState(0)
  const multi = urls.length > 1
  const go = (e: React.MouseEvent, dir: number) => {
    e.stopPropagation()
    setI((p) => (p + dir + urls.length) % urls.length)
  }
  const index = Math.min(i, Math.max(0, urls.length - 1))

  return (
    <div className={cn('relative flex aspect-video items-center justify-center overflow-hidden', fit === 'contain' ? 'bg-white' : 'bg-muted/40')}>
      {urls.length ? (
        <img
          src={urls[index]}
          alt=""
          className={cn('h-full w-full', fit === 'contain' ? 'object-contain p-4' : 'object-cover')}
        />
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
  const { spec, card } = model
  const apiUrl = useApiUrl()

  const imageField = card.image
  const hasImage = Boolean(imageField)
  const titleField = card.title
  const subtitleField = card.subtitle
  const badgeFields = card.badges
  const bodyFields = card.body
  const highlightField = card.highlight
  const imageFit = imageField?.image?.fit
  const centered = card.align === 'center'
  // Fluid mode (card.maxWidth set): cards auto-fill/wrap at min..max px, capped width,
  // adapting to any viewport. Otherwise: fixed responsive columns (card.columns).
  const fluid = card.maxWidth != null
  const gridStyle = fluid
    ? {
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${card.minWidth ?? 240}px), ${card.maxWidth}px))`
      }
    : undefined
  const gridCls = fluid
    ? 'grid justify-center gap-4'
    : cn('grid gap-4', GRID_BY_COLS[card.columns ?? 3] ?? GRID_BY_COLS[3])

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.loading')}</div>
  }
  if (records.length === 0) {
    return <div className="py-10 text-center text-muted-foreground">{t('state.empty')}</div>
  }

  return (
    <div className={gridCls} style={gridStyle}>
      {records.map((record: any) => {
        const urls = hasImage ? imageUrls(record, imageField?.name).map((u) => absoluteUrl(apiUrl, u)) : []
        const featured = highlightField ? Boolean(record[highlightField]) : false
        const hasRowActions = model.actions.some((a) => !a.target || a.target.includes('row'))
        const actions = (canEdit || canDelete || hasRowActions) && (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <RowActions model={model} record={record} t={t} variant="secondary" className="h-7 w-7" />
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
            className={cn(
              'group cursor-pointer overflow-hidden transition-shadow hover:shadow-md',
              featured && 'ring-2 ring-amber-400 ring-offset-1'
            )}
            onClick={() => onShow(record.id)}
          >
            {hasImage && (
              <div className="relative">
                <CardCarousel urls={urls} fit={imageFit} />
                {featured && (
                  <div className="absolute left-2 top-2">
                    <FeaturedBadge t={t} />
                  </div>
                )}
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  {actions}
                </div>
              </div>
            )}
            <div className={cn('space-y-2 p-3', centered && 'text-center')}>
              {featured && !hasImage && (
                <div>
                  <FeaturedBadge t={t} />
                </div>
              )}
              <div className={cn('flex items-start gap-2', centered ? 'justify-center' : 'justify-between')}>
                <div className="min-w-0">
                  <div className="truncate font-medium">{display(record, titleField) || '—'}</div>
                  {display(record, subtitleField) && (
                    <div className="truncate text-sm text-muted-foreground">
                      {display(record, subtitleField)}
                    </div>
                  )}
                </div>
                {!hasImage && !centered && (
                  <div className="opacity-0 transition-opacity group-hover:opacity-100">{actions}</div>
                )}
              </div>
              {badgeFields.length > 0 && (
                <div className={cn('flex flex-wrap items-center gap-1', centered && 'justify-center')}>
                  {badgeFields.map((f) => (
                    <FieldCell key={f.name} record={record} field={f} t={t} />
                  ))}
                </div>
              )}
              {bodyFields.length > 0 && (
                <div className="space-y-1 border-t pt-2">
                  {bodyFields.map(({ field, label }) => (
                    <div key={field.name} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-muted-foreground">
                        {t(label ?? field.label ?? `field.${spec.name}.${field.name}`)}
                      </span>
                      <FieldCell record={record} field={field} t={t} />
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
